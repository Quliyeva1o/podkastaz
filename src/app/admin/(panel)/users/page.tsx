import { Trash } from "@phosphor-icons/react/dist/ssr";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { buttonClass, Card, PageHeader } from "../_components/cms";
import { ConfirmButton } from "../_components/cms-client";
import { deleteUserAction } from "./actions";
import { AddUserForm, EditUserForm } from "./user-forms";

/** Admin users (PLAN.md §8): add, rename, role, new password, delete. Admins only. */
export default async function UsersPage() {
  const me = await requireUser();
  const crumbs = [{ label: "Dashboard", href: "/admin" }, { label: "Admin istifadəçilər" }];
  if (me.role !== "admin") {
    return (
      <>
        <PageHeader title="Admin istifadəçilər" crumbs={crumbs} />
        <Card>
          <p className="text-[14px] text-cms-muted">İstifadəçiləri yalnız admin rolu olanlar idarə edə bilər.</p>
        </Card>
      </>
    );
  }
  const rows = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).orderBy(asc(users.createdAt));

  return (
    <>
      <PageHeader title="Admin istifadəçilər" crumbs={crumbs} />
      <div className="flex flex-col gap-6">
        <Card title="Yeni istifadəçi">
          <p className="mb-4 text-[14px] text-cms-muted">
            Şifrəni istifadəçiyə özünüz çatdırın (email ilə göndərilmir). Şifrə dəyişəndə həmin istifadəçi bütün cihazlarda çıxır.
          </p>
          <AddUserForm />
        </Card>
        {rows.map((u) => (
          <Card key={u.id} title={`${u.email}${u.id === me.id ? " (siz)" : ""}`}>
            <div className="flex flex-col gap-4">
              <EditUserForm user={u} self={u.id === me.id} />
              {u.id !== me.id && (
                <form action={deleteUserAction}>
                  <input type="hidden" name="id" value={u.id} />
                  <ConfirmButton message={`${u.email} silinsin?`} className={buttonClass("danger", "px-3")}>
                    <Trash size={16} weight="fill" />
                    İstifadəçini sil
                  </ConfirmButton>
                </form>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
