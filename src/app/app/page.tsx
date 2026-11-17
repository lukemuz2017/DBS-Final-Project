import { UserDashboard } from "@/components/userApp";

export const metadata = { title: "Runway · Your forecast" };

// Signed in only (proxy.ts). Everything here loads in the browser with the user's
// session, so the server never renders anyone's data.
export default function AppHome() {
  return <UserDashboard />;
}
