-- D032 a D036: horários sugeridos, proposta vigente, assunto, mensagem, formato e local
-- das reuniões. Compatível com a V20: as reuniões existentes viram propostas de
-- 1 horário (o starts_at atual), feitas pelo organizador, no formato ONLINE.

ALTER TABLE meetings ADD COLUMN subject VARCHAR(40);
ALTER TABLE meetings ADD COLUMN message VARCHAR(280);
ALTER TABLE meetings ADD COLUMN format VARCHAR(12) NOT NULL DEFAULT 'ONLINE';
ALTER TABLE meetings ADD CONSTRAINT ck_meetings_format CHECK (format IN ('ONLINE', 'PRESENCIAL'));
ALTER TABLE meetings ADD COLUMN location_name VARCHAR(150);
ALTER TABLE meetings ADD COLUMN location_address VARCHAR(255);
ALTER TABLE meetings ADD COLUMN location_reference VARCHAR(255);

-- Quem fez a proposta de horários que está valendo (o outro lado é quem responde)
ALTER TABLE meetings ADD COLUMN proposer_user_id BIGINT;
UPDATE meetings SET proposer_user_id = organizer_user_id;
ALTER TABLE meetings ALTER COLUMN proposer_user_id SET NOT NULL;
ALTER TABLE meetings ADD CONSTRAINT fk_meetings_proposer_user
    FOREIGN KEY (proposer_user_id) REFERENCES users (id);

CREATE TABLE meeting_suggested_times (
    id BIGSERIAL PRIMARY KEY,
    meeting_id BIGINT NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    position INTEGER NOT NULL,
    CONSTRAINT fk_meeting_suggested_times_meeting
        FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE,
    CONSTRAINT uk_meeting_suggested_times_position UNIQUE (meeting_id, position),
    CONSTRAINT ck_meeting_suggested_times_position CHECK (position BETWEEN 1 AND 3)
);

-- Reuniões já existentes: o horário atual vira o único horário sugerido
INSERT INTO meeting_suggested_times (meeting_id, starts_at, position)
SELECT id, starts_at, 1 FROM meetings;
