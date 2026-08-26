import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = url && key ? createClient(url, key) : null;

export default function Home() {
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState(
    "I found this cat and it is safe."
  );
  const [result, setResult] = useState("");

  async function report() {
  if (!supabase) {
    setResult(
      "Setup missing: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing."
    );
    return;
  }

  if (!navigator.geolocation) {
    setResult("Location is not supported by this browser.");
    return;
  }

  setState("loading");
  setResult("Requesting location permission...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { data: cats, error: catError } = await supabase
        .from("cats")
        .select("*");

        alert(JSON.stringify(cats));
        console.log(cats);

        setState("idle");
        return;

        if (catError) {
          setState("idle");
          setResult(
            `Cat query failed: ${catError.message} | Code: ${
              catError.code || "unknown"
            }`
          );
          return;
        }

        if (!cats || cats.length === 0) {
          setState("idle");
          setResult(
            `Connected to Supabase, but luna123 is not visible. Supabase URL: ${url}`
          );
          return;
        }

        const cat = cats[0];

        const reportData = {
          cat_id: cat.id,
          latitude: Number(position.coords.latitude),
          longitude: Number(position.coords.longitude),
          accuracy_m: Number(position.coords.accuracy),
          message: message.trim()
        };

        const { data: insertedReport, error: insertError } = await supabase
          .from("finder_reports")
          .insert(reportData)
          .select("id, created_at")
          .single();

        setState("idle");

        if (insertError) {
          setResult(
            `Report insert failed: ${insertError.message} | Code: ${
              insertError.code || "unknown"
            }`
          );
          return;
        }

        setResult(
          `Thank you! Luna's location was saved. Report ID: ${insertedReport.id}`
        );
      } catch (error) {
        setState("idle");
        setResult(`Unexpected error: ${error.message}`);
      }
    },
    (error) => {
      setState("idle");
      setResult(
        `Location was not shared: ${error.message} | Code: ${error.code}`
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

  return (
    <main>
      <section className="hero">
        <div className="cat">🐈</div>
        <span className="status">MISSING</span>
      </section>

      <section className="card">
        <p className="eyebrow">YOU FOUND</p>

        <h1>Luna</h1>

        <p className="lead">
          Friendly cat, but may be frightened. Please keep Luna somewhere
          safe.
        </p>

        <div className="facts">
          <div>
            <small>COLOR</small>
            <b>Black</b>
          </div>

          <div>
            <small>AGE</small>
            <b>3 years</b>
          </div>
        </div>

        <label>Message to owner</label>

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />

        <button
          disabled={state === "loading"}
          onClick={report}
        >
          {state === "loading"
            ? "Getting location..."
            : "📍 I found this cat"}
        </button>

        {result && <p className="result">{result}</p>}

        <p className="privacy">
          Your location is shared only after browser permission.
        </p>
      </section>

      <style jsx>{`
        main {
          min-height: 100vh;
          background: #f4f7f2;
          font-family: Arial, sans-serif;
          padding: 24px;
          color: #1e293b;
        }

        .hero,
        .card {
          max-width: 520px;
          margin: 0 auto;
        }

        .hero {
          position: relative;
          height: 230px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #fed7aa, #dcfce7);
          border-radius: 28px 28px 0 0;
        }

        .cat {
          font-size: 110px;
        }

        .status {
          position: absolute;
          top: 20px;
          left: 20px;
          padding: 7px 12px;
          border-radius: 999px;
          background: #fee2e2;
          color: #be123c;
          font-size: 12px;
          font-weight: bold;
        }

        .card {
          box-sizing: border-box;
          padding: 28px;
          background: white;
          border-radius: 0 0 28px 28px;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);
        }

        .eyebrow {
          margin: 0;
          color: #047857;
          font-size: 12px;
          font-weight: bold;
          letter-spacing: 1px;
        }

        h1 {
          margin: 5px 0 8px;
          font-size: 44px;
        }

        .lead {
          color: #475569;
          line-height: 1.5;
        }

        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin: 20px 0;
        }

        .facts div {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 14px;
          background: #f8fafc;
          border-radius: 14px;
        }

        small {
          color: #64748b;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: bold;
        }

        textarea {
          box-sizing: border-box;
          width: 100%;
          min-height: 90px;
          padding: 13px;
          border: 1px solid #cbd5e1;
          border-radius: 14px;
          font: inherit;
          resize: vertical;
        }

        button {
          width: 100%;
          margin-top: 16px;
          padding: 15px;
          border: 0;
          border-radius: 14px;
          background: #059669;
          color: white;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        }

        button:disabled {
          background: #94a3b8;
          cursor: not-allowed;
        }

        .result {
          padding: 12px;
          border-radius: 12px;
          background: #ecfdf5;
          color: #065f46;
          line-height: 1.4;
        }

        .privacy {
          margin-bottom: 0;
          text-align: center;
          color: #64748b;
          font-size: 12px;
        }
      `}</style>
    </main>
  );
}
