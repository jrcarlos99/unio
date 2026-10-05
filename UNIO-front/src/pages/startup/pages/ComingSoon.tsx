import AdminPageHeader from "../../admin/components/AdminPageHeader";

interface ComingSoonProps {
  title: string;
}

// Placeholder for the sections that will be built later.
export default function ComingSoon({ title }: ComingSoonProps) {
  return (
    <div>
      <AdminPageHeader title={title} />
      <div className="rounded-2xl border border-deepgreen/10 bg-white p-5">
        <p className="text-deepgreen">Esta seção está em construção e estará disponível em breve.</p>
      </div>
    </div>
  );
}
