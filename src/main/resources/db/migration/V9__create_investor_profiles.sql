CREATE TABLE investor_profiles (
    user_id BIGINT PRIMARY KEY,
    segmentos_interesse VARCHAR(255),
    estagios_interesse VARCHAR(255),
    ticket_minimo NUMERIC(19, 2),
    ticket_maximo NUMERIC(19, 2),
    regiao_interesse VARCHAR(255),
    perfil_risco VARCHAR(255),
    CONSTRAINT fk_investor_profiles_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);
