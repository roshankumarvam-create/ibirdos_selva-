import postgres from "postgres";
import { getCurrentUser } from "../lib/currentUser";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

export default async function IngredientsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser?.company_id) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Ingredients</h1>
        <p className="mt-4 text-red-600">No company found for this user.</p>
      </main>
    );
  }

  const ingredients = await sql`
    SELECT id, name, latest_cost, unit, created_at
    FROM ingredients
    WHERE company_id = ${currentUser.company_id}
    ORDER BY created_at DESC
    LIMIT 100;
  `;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Ingredients</h1>

      {ingredients.length === 0 ? (
        <p className="text-slate-500">No ingredients yet.</p>
      ) : (
        <div className="space-y-3">
          {ingredients.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border bg-white p-4 shadow-sm"
            >
              <p className="font-semibold">{item.name}</p>
              <p className="text-sm text-slate-600">
                ${Number(item.latest_cost || 0).toFixed(2)} /{" "}
                {item.unit || "unit"}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}