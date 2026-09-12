CREATE TABLE score_policies (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    investor_profile_type VARCHAR(50) NOT NULL,
    version INTEGER NOT NULL,
    active BOOLEAN NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP NOT NULL
);
