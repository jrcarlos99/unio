-- T09b — Agendamento de reuniões (RF05)
CREATE TABLE meetings (
    id BIGSERIAL PRIMARY KEY,
    organizer_user_id BIGINT NOT NULL,
    invitee_user_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    agenda TEXT,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    meeting_url VARCHAR(500),
    status VARCHAR(20) NOT NULL,
    cancel_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_meetings_organizer_user
        FOREIGN KEY (organizer_user_id) REFERENCES users (id),
    CONSTRAINT fk_meetings_invitee_user
        FOREIGN KEY (invitee_user_id) REFERENCES users (id),
    CONSTRAINT ck_meetings_period CHECK (ends_at > starts_at),
    CONSTRAINT ck_meetings_status
        CHECK (status IN ('PENDENTE', 'CONFIRMADA', 'RECUSADA', 'CANCELADA', 'REALIZADA'))
);

CREATE INDEX idx_meetings_organizer_starts ON meetings (organizer_user_id, starts_at);
CREATE INDEX idx_meetings_invitee_starts ON meetings (invitee_user_id, starts_at);
