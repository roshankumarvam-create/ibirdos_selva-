import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type");

    let id;

    if (contentType?.includes("application/json")) {
      const body = await req.json();
      id = body.id;
    } else {
      const formData = await req.formData();
      id = formData.get("id");
    }

    if (!id) {
      return Response.json(
        { ok: false, error: "Missing alert id" },
        { status: 400 }
      );
    }

    await sql`
      UPDATE alerts
      SET status = 'reviewed'
      WHERE id = ${id};
    `;

    return Response.redirect(new URL("/dashboard", req.url), 303);
  } catch (error: any) {
    return Response.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}