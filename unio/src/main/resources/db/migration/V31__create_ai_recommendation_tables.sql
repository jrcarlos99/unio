CREATE TABLE investor_preferences (
                                      id BIGSERIAL PRIMARY KEY,
                                      investor_id BIGINT NOT NULL,
                                      preference_data JSONB NOT NULL,
                                      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                      CONSTRAINT fk_investor_preferences_investor
                                          FOREIGN KEY (investor_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_investor_preferences_investor_id
    ON investor_preferences (investor_id);

CREATE TABLE ai_recommendations (
                                    id BIGSERIAL PRIMARY KEY,
                                    investor_id BIGINT NOT NULL,
                                    startup_id BIGINT NOT NULL,
                                    ai_score DECIMAL(5,2) NOT NULL,
                                    reason TEXT NOT NULL,
                                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                    CONSTRAINT fk_ai_recommendations_investor
                                        FOREIGN KEY (investor_id) REFERENCES users (id) ON DELETE CASCADE,
                                    CONSTRAINT fk_ai_recommendations_startup
                                        FOREIGN KEY (startup_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_recommendations_investor_id
    ON ai_recommendations (investor_id);

CREATE INDEX idx_ai_recommendations_investor_startup
    ON ai_recommendations (investor_id, startup_id);

GRANT SELECT, INSERT, UPDATE, DELETE
      ON TABLE investor_preferences, ai_recommendations
          TO ia_reader;

GRANT USAGE, SELECT
             ON SEQUENCE investor_preferences_id_seq, ai_recommendations_id_seq
                 TO ia_reader;