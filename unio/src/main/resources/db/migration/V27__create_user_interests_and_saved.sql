-- D049 e D050: interesse e salvos entre STARTUP e INVESTOR.
--
-- user_interests: "Tenho interesse" de from_user_id em to_user_id. O match mútuo
-- não tem tabela própria: existe quando há as duas linhas (A -> B e B -> A).
-- user_saved: lista de salvos (bookmark) de user_id.
--
-- A regra "só entre STARTUP e INVESTOR" fica no InterestService (o papel está em
-- users.role). Na exclusão de conta (D055) as linhas do titular, dos dois lados,
-- são apagadas.
CREATE TABLE user_interests (
    id BIGSERIAL PRIMARY KEY,
    from_user_id BIGINT NOT NULL,
    to_user_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT fk_user_interests_from FOREIGN KEY (from_user_id) REFERENCES users (id),
    CONSTRAINT fk_user_interests_to FOREIGN KEY (to_user_id) REFERENCES users (id),
    CONSTRAINT uk_user_interests_from_to UNIQUE (from_user_id, to_user_id),
    CONSTRAINT ck_user_interests_not_self CHECK (from_user_id <> to_user_id)
);

CREATE INDEX idx_user_interests_to ON user_interests (to_user_id);

CREATE TABLE user_saved (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    target_user_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT fk_user_saved_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_user_saved_target FOREIGN KEY (target_user_id) REFERENCES users (id),
    CONSTRAINT uk_user_saved_user_target UNIQUE (user_id, target_user_id),
    CONSTRAINT ck_user_saved_not_self CHECK (user_id <> target_user_id)
);

CREATE INDEX idx_user_saved_target ON user_saved (target_user_id);
