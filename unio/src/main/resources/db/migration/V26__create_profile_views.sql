-- D041 (RF10): contagem agregada de visitas ao perfil. Uma linha por visitante,
-- por perfil visitado, por dia (a UNIQUE garante a regra mesmo com cliques
-- repetidos). O visitante nunca é exposto em resposta da API: as telas só
-- recebem totais. Na exclusão de conta (T13, D044) as linhas do titular, como
-- visitante ou como visitado, são apagadas.
CREATE TABLE profile_views (
    id BIGSERIAL PRIMARY KEY,
    target_user_id BIGINT NOT NULL,
    viewer_user_id BIGINT NOT NULL,
    viewed_on DATE NOT NULL,
    CONSTRAINT fk_profile_views_target
        FOREIGN KEY (target_user_id) REFERENCES users (id),
    CONSTRAINT fk_profile_views_viewer
        FOREIGN KEY (viewer_user_id) REFERENCES users (id),
    CONSTRAINT uk_profile_views_target_viewer_day UNIQUE (target_user_id, viewer_user_id, viewed_on),
    CONSTRAINT ck_profile_views_not_self CHECK (target_user_id <> viewer_user_id)
);

CREATE INDEX idx_profile_views_target_day ON profile_views (target_user_id, viewed_on);
CREATE INDEX idx_profile_views_viewer ON profile_views (viewer_user_id);
