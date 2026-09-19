import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary">Hospital Management System</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Clinic & Small Hospital Management Software
        </p>
      </div>

      <div className="grid max-w-md gap-4">
        <Link
          href="/login"
          className="flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          Login to Dashboard
        </Link>
        <Link
          href="/signup"
          className="flex items-center justify-center rounded-lg border border-border px-6 py-3 font-medium hover:bg-muted transition-colors"
        >
          Create Account
        </Link>
      </div>

      <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "Admin Panel", desc: "Full system control & management" },
          { title: "Doctor Portal", desc: "OPD, Prescriptions & EMR" },
          { title: "Nursing Station", desc: "Vitals, Beds & Patient Care" },
          { title: "Lab Department", desc: "Test Queue & Reports" },
          { title: "Patient Portal", desc: "Appointments & Records" },
          { title: "Staff Dashboard", desc: "Room & Facility Management" },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-lg border border-border p-4 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
