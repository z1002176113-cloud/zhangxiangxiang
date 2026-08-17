import { ProfileCard } from "@/components/home/ProfileCard";

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-content">
        <ProfileCard />
      </div>
    </div>
  );
}
