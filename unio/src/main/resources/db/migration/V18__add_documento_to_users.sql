ALTER TABLE users
    ADD COLUMN documento VARCHAR(14);

ALTER TABLE users
    ADD CONSTRAINT uk_users_documento UNIQUE (documento);
