import { redirect } from "next/navigation";

// Predict a Winner now lives as a tab on the Predictions page.
export default function PredictWinnerRedirect() {
  redirect("/predictions?tab=winner");
}
