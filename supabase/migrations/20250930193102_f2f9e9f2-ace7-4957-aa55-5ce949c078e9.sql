-- Enable full row-level replication for messages table
ALTER TABLE messages REPLICA IDENTITY FULL;