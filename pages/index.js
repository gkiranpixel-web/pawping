export default function Home() {
  return (
    <div
      style={{
        fontFamily: "Arial",
        maxWidth: "600px",
        margin: "50px auto",
        textAlign: "center"
      }}
    >
      <h1>🐱 PawPing</h1>

      <h2>Luna</h2>

      <p>I may be lost. Please help me get home.</p>

      <button
        style={{
          padding: "12px 24px",
          borderRadius: "8px"
        }}
      >
        Share Location
      </button>

      <br /><br />

      <textarea
        rows="4"
        cols="40"
        placeholder="Message to owner"
      />

      <br /><br />

      <button
        style={{
          padding: "12px 24px",
          borderRadius: "8px"
        }}
      >
        Notify Owner
      </button>
    </div>
  );
}