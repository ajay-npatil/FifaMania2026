import { redirect } from "next/navigation";

// Everyone's Picks now lives as a tab on the Predictions page.
export default function TournamentPicksRedirect() {
  redirect("/predictions?tab=everyone");
}
