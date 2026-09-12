CREATE TABLE feedback_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    investor_id UUID NOT NULL,
    startup_id UUID NOT NULL,
    score_policy_id BIGINT NOT NULL,
    action VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_feedback_events_score_policy
        FOREIGN KEY (score_policy_id)
        REFERENCES score_policies(id)
);

CREATE INDEX idx_feedback_events_dedup
    ON feedback_events(investor_id, startup_id, score_policy_id, action, created_at);
