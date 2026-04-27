import { supabase } from '../config/supabase.js';
import { encrypt, decrypt } from '../utils/encryption.js';

export const getConversationId = (id1, id2) => {
  return [id1, id2].sort().join('_');
};

export const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, type, content, fileName, fileSize, duration, replyTo } = req.body;
    const conversationId = getConversationId(senderId, receiverId);

    const { data: newMessage, error: msgError } = await supabase
      .from('messages')
      .insert({
        senderId,
        receiverId,
        conversationId,
        type,
        text: encrypt(content),
        mediaUrl: fileName, // Assuming fileName maps to mediaUrl in this context
        mediaSize: fileSize,
        mediaDuration: duration,
        replyTo
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // Update or create conversation
    let { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('participant_ids', `{${senderId},${receiverId}}`)
      .single();

    if (convError || !conversation) {
      await supabase.from('conversations').insert({
        participant_ids: [senderId, receiverId],
        lastMessageId: newMessage.id,
        lastMessageTime: new Date().toISOString()
      });
    } else {
      await supabase.from('conversations').update({
        lastMessageId: newMessage.id,
        lastMessageTime: new Date().toISOString()
      }).eq('id', conversation.id);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId, before, limit = 20 } = req.query;

    if (!userId) return res.status(400).json({ error: 'userId query parameter is required' });

    let queryBuilder = supabase
      .from('messages')
      .select('*')
      .eq('conversationId', conversationId)
      .not('deletedFor', 'cs', `{${userId}}`)
      .order('createdAt', { ascending: false })
      .limit(parseInt(limit));

    if (before) {
      queryBuilder = queryBuilder.lt('createdAt', before);
    }

    const { data: messages, error } = await queryBuilder;
    if (error) throw error;

    const decryptedMessages = messages.map(msg => ({
      ...msg,
      content: decrypt(msg.text)
    })).reverse();

    res.status(200).json(decryptedMessages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const softDeleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('deletedFor')
      .eq('id', messageId)
      .single();

    if (fetchError) throw fetchError;

    const deletedFor = [...(message.deletedFor || [])];
    if (!deletedFor.includes(userId)) {
      deletedFor.push(userId);
    }

    const { data: updated, error: updateError } = await supabase
      .from('messages')
      .update({ deletedFor })
      .eq('id', messageId)
      .select()
      .single();

    if (updateError) throw updateError;
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const hardDeleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) return res.status(404).json({ error: 'Message not found' });

    const timeDiff = (Date.now() - new Date(message.createdAt).getTime()) / 1000;
    if (timeDiff > 60) {
      return res.status(403).json({ error: 'Can only delete for everyone within 60 seconds' });
    }

    const { data: updated, error: updateError } = await supabase
      .from('messages')
      .update({
        text: encrypt('This message was deleted'),
        type: 'text',
        mediaUrl: null,
        mediaSize: null,
        mediaDuration: null,
        isDeleted: true
      })
      .eq('id', messageId)
      .select()
      .single();

    if (updateError) throw updateError;
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const { data: updated, error } = await supabase
      .from('messages')
      .update({
        text: encrypt(content),
        isEdited: true,
        editedAt: new Date().toISOString()
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, emoji } = req.body;

    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('reactions')
      .eq('id', messageId)
      .single();

    if (fetchError) throw fetchError;

    let reactions = [...(message.reactions || [])].filter(r => r.userId !== userId);
    if (emoji) {
      reactions.push({ userId, emoji });
    }

    const { data: updated, error: updateError } = await supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId)
      .select()
      .single();

    if (updateError) throw updateError;
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleStarMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('isStarred')
      .eq('id', messageId)
      .single();

    if (fetchError) throw fetchError;

    let isStarred = [...(message.isStarred || [])];
    const index = isStarred.indexOf(userId);
    if (index > -1) {
      isStarred.splice(index, 1);
    } else {
      isStarred.push(userId);
    }

    const { data: updated, error: updateError } = await supabase
      .from('messages')
      .update({ isStarred })
      .eq('id', messageId)
      .select()
      .single();

    if (updateError) throw updateError;
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;

    const { data: updated, error } = await supabase
      .from('messages')
      .update({ status })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPendingCount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiverId', userId)
      .eq('status', 'sent');

    if (error) throw error;

    res.json({ 
      success: true, 
      pendingCount: count,
      message: count > 0 
        ? `You have ${count} undelivered message${count > 1 ? 's' : ''}` 
        : 'No pending messages'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check pending messages', details: err.message });
  }
};
