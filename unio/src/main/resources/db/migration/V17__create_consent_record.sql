CREATE TABLE consent_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    accepted_terms BOOLEAN NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_consent_records_user
        FOREIGN KEY (user_id) REFERENCES users (id)
);
