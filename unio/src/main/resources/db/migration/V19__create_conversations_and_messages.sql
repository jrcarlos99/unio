-- T09a — Mensagens (RF05)
-- Uma conversa liga exatamente um usuário STARTUP a um usuário INVESTOR.
CREATE TABLE conversations (
    id BIGSERIAL PRIMARY KEY,
    startup_user_id BIGINT NOT NULL,
    investor_user_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_conversations_startup_user
        FOREIGN KEY (startup_user_id) REFERENCES users (id),
    CONSTRAINT fk_conversations_investor_user
        FOREIGN KEY (investor_user_id) REFERENCES users (id),
    CONSTRAINT uk_conversations_pair UNIQUE (startup_user_id, investor_user_id)
);

CREATE INDEX idx_conversations_investor_user ON conversations (investor_user_id);

CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    sender_user_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_messages_conversation
        FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_sender_user
        FOREIGN KEY (sender_user_id) REFERENCES users (id)
);

CREATE INDEX idx_messages_conversation_created ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages (conversation_id, sender_user_id) WHERE read_at IS NULL;
