import { supabase } from '../config/supabase.js';

export const getConversations = async (req, res) => {
  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          user:users(id, name, avatar, mobile, is_online, last_seen)
        ),
        lastMessage:messages(*)
      `)
      .contains('participant_ids', [req.user.id])
      .order('last_message_time', { ascending: false });

    if (error) throw error;

    // Format for frontend
    const formatted = conversations.map(c => ({
      ...c,
      participants: c.participants.map(p => p.user),
      lastMessage: c.lastMessage[0] || null
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMessages = async (req, res) => {
  let { conversationId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const skip = (page - 1) * limit;

  try {
    // 1. Try fetching by direct conversationId
    let { data: messages, error, count } = await supabase
      .from('messages')
      .select('*, sender:users(id, name, avatar), reply_to:messages(*)', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .not('deleted_for', 'cs', `{${req.user.id}}`)
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);

    // 2. If no messages found and conversationId looks like a UUID (Supabase ID), 
    // it might actually be a userId from a contact click.
    if ((!messages || messages.length === 0) && conversationId.includes('-')) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [req.user.id, conversationId])
        .single();
      
      if (conversation) {
        const { data: retryMessages, count: retryCount } = await supabase
          .from('messages')
          .select('*, sender:users(id, name, avatar), reply_to:messages(*)', { count: 'exact' })
          .eq('conversation_id', conversation.id)
          .not('deleted_for', 'cs', `{${req.user.id}}`)
          .order('created_at', { ascending: false })
          .range(skip, skip + limit - 1);
        
        messages = retryMessages || [];
        count = retryCount || 0;
      }
    }

    if (error && !messages) throw error;

    res.status(200).json({
      success: true,
      data: messages ? messages.reverse() : [],
      pagination: {
        total: count || 0,
        page,
        hasMore: (count || 0) > skip + limit
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendMessage = async (req, res) => {
    // Frontend sends 'content', but DB uses 'text'
    const { receiverId, type, text, content, replyTo } = req.body;
    const messageText = text || content;
  
    try {
      // Find or create conversation
      let { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [req.user.id, receiverId])
        .single();
  
      if (convError || !conversation) {
        const { data: newConv, error: createConvError } = await supabase
          .from('conversations')
          .insert({
            participant_ids: [req.user.id, receiverId],
            unread_count: { [receiverId]: 1 }
          })
          .select()
          .single();
        
        if (createConvError) throw createConvError;
        conversation = newConv;
      }
  
      // Use columns: conversation_id, sender_id, receiver_id, text, is_read
      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: req.user.id,
          receiver_id: receiverId,
          text: messageText,
          is_read: false
        })
        .select(`
          *,
          sender:users(id, name, avatar)
        `)
        .single();
  
      if (msgError) throw msgError;
 
      // Update conversation
      const newUnread = { ...conversation.unread_count };
      newUnread[receiverId] = (newUnread[receiverId] || 0) + 1;
 
      await supabase
        .from('conversations')
        .update({
          last_message_id: message.id,
          last_message_time: new Date().toISOString(),
          unread_count: newUnread
        })
        .eq('id', conversation.id);
  
      // Real-time: emit to receiver's room
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${receiverId}`).emit('new_message', message);
      }
 
      res.status(201).json({ success: true, data: message });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

export const editMessage = async (req, res) => {
  const { messageId } = req.params;
  const { text } = req.body;

  try {
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.sender_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - new Date(message.created_at).getTime() > fifteenMinutes) {
      return res.status(400).json({ success: false, message: 'Edit window (15 mins) expired' });
    }

    const { data: updated, error: updateError } = await supabase
      .from('messages')
      .update({
        text,
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const { forEveryone } = req.body;

  try {
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (forEveryone) {
      if (message.sender_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      await supabase
        .from('messages')
        .update({ is_deleted: true })
        .eq('id', messageId);
    } else {
      const deleted_for = [...(message.deleted_for || [])];
      if (!deleted_for.includes(req.user.id)) {
        deleted_for.push(req.user.id);
        await supabase
          .from('messages')
          .update({ deleted_for })
          .eq('id', messageId);
      }
    }

    res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const reactToMessage = async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  try {
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('reactions')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) return res.status(404).json({ success: false, message: 'Message not found' });

    let reactions = [...(message.reactions || [])];
    const existingIndex = reactions.findIndex(r => r.userId === req.user.id);

    if (existingIndex > -1) {
      if (reactions[existingIndex].emoji === emoji) {
        reactions.splice(existingIndex, 1);
      } else {
        reactions[existingIndex].emoji = emoji;
      }
    } else {
      reactions.push({ userId: req.user.id, emoji });
    }

    const { data: updated, error: updateError } = await supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId)
      .select('reactions')
      .single();

    if (updateError) throw updateError;
    res.status(200).json({ success: true, data: updated.reactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleStarMessage = async (req, res) => {
  const { messageId } = req.params;

  try {
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('is_starred')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) return res.status(404).json({ success: false, message: 'Message not found' });

    let is_starred = [...(message.is_starred || [])];
    const starIndex = is_starred.indexOf(req.user.id);
    
    if (starIndex > -1) {
      is_starred.splice(starIndex, 1);
    } else {
      is_starred.push(req.user.id);
    }

    await supabase
      .from('messages')
      .update({ is_starred })
      .eq('id', messageId);

    res.status(200).json({ success: true, message: 'Starred toggle success' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  const { conversationId } = req.params;

  try {
    await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', req.user.id)
      .neq('status', 'read');

    const { data: conversation } = await supabase
      .from('conversations')
      .select('unread_count')
      .eq('id', conversationId)
      .single();

    if (conversation) {
      const newUnread = { ...conversation.unread_count };
      newUnread[req.user.id] = 0;
      await supabase
        .from('conversations')
        .update({ unread_count: newUnread })
        .eq('id', conversationId);
    }

    res.status(200).json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStarredMessages = async (req, res) => {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, sender:users(id, name, avatar)')
      .contains('is_starred', [req.user.id])
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
