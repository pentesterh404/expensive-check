import { redirect } from "next/navigation";
export default async function DeleteDbPage() {
  redirect("/user-manager");
}
