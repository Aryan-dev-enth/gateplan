import LogsClient from "./LogsClient";

export const metadata = {
  title: "Activity Logs - Course Tracker",
  description: "View account activity logs.",
};

export default function LogsPage() {
  return <LogsClient />;
}
