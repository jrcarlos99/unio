-- D063 (RF08, RNF10, RF06): moderação de cadastros e publicação do pitch.
-- Só cria tabelas novas; nenhuma tabela existente é alterada.

-- Situação de moderação de uma conta. Sem linha = APROVADO (contas antigas seguem iguais).
CREATE TABLE account_moderation (
    user_id BIGINT PRIMARY KEY,
    status VARCHAR(20) NOT NULL,
    reason VARCHAR(255),
    reviewed_by_user_id BIGINT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_account_moderation_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_account_moderation_reviewer
        FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id),
    CONSTRAINT ck_account_moderation_status
        CHECK (status IN ('APROVADO', 'PENDENTE', 'RECUSADO', 'SUSPENSO'))
);

CREATE INDEX idx_account_moderation_status ON account_moderation (status);

-- Um registro por envio do pitch e do Lean Canvas; o de maior versão é o que vale.
CREATE TABLE startup_pitch_publication (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    pitch_text TEXT NOT NULL,
    video_url VARCHAR(500),
    canvas_json TEXT NOT NULL,
    version INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    reason VARCHAR(255),
    reviewed_by_user_id BIGINT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_pitch_publication_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_pitch_publication_reviewer
        FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id),
    CONSTRAINT uk_pitch_publication_user_version
        UNIQUE (user_id, version),
    CONSTRAINT ck_pitch_publication_status
        CHECK (status IN ('EM_REVISAO', 'PUBLICADO', 'REMOVIDO'))
);

CREATE INDEX idx_pitch_publication_status ON startup_pitch_publication (status);
