import { Link } from "react-router-dom";
import { MapPin, Video } from "lucide-react";
import { MEETING_FORMAT_LABELS } from "../labels";
import type { NextMeeting } from "../types";
import { formatMeetingDate, getInitials } from "../utils/format";

interface NextMeetingCardProps {
  meeting: NextMeeting | null;
  className?: string;
}

const linkClass =
  "mt-4 inline-block rounded-full bg-deepgreen px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-sage hover:text-deepgreen";

export default function NextMeetingCard({ meeting, className = "" }: NextMeetingCardProps) {
  return (
    <section className={`rounded-2xl border border-deepgreen/10 bg-white p-5 ${className}`}>
      <h2 className="text-sm font-medium text-deepgreen">Próxima reunião</h2>

      {meeting ? (
        <>
          <div className="mt-4 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-deepgreen text-sm font-bold text-white"
            >
              {getInitials(meeting.investorName)}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-deepgreen">{meeting.investorName}</p>
              <p className="flex items-center gap-1 text-xs text-deepgreen/70">
                {meeting.format === "ONLINE" ? (
                  <Video size={14} aria-hidden="true" />
                ) : (
                  <MapPin size={14} aria-hidden="true" />
                )}
                {MEETING_FORMAT_LABELS[meeting.format]}
              </p>
            </div>
          </div>

          <p className="mt-3 text-lg font-semibold text-deepgreen">
            <time dateTime={meeting.scheduledAt}>{formatMeetingDate(meeting.scheduledAt)}</time>
          </p>

          <Link to="/home-startup/reunioes" className={linkClass}>
            Ver agenda
          </Link>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm text-deepgreen">Nenhuma reunião agendada ainda.</p>
          <Link to="/home-startup/investidores" className={linkClass}>
            Ver investidores
          </Link>
        </>
      )}
    </section>
  );
}
