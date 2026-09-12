CREATE TABLE startup_profiles (
    user_id BIGINT PRIMARY KEY,
    segmento VARCHAR(255) NOT NULL,
    estagio VARCHAR(255) NOT NULL,
    localizacao VARCHAR(255) NOT NULL,
    modelo_negocio VARCHAR(255) NOT NULL,
    mercado_alvo VARCHAR(255) NOT NULL,
    capital_procurado NUMERIC(19, 2) NOT NULL,
    pitch_canvas TEXT,
    CONSTRAINT fk_startup_profiles_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);
