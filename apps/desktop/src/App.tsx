import { useState, useEffect } from "react";
import { ArrowRight, CheckCircle2, Clapperboard, Download, Film, Gauge, Globe2, Home, ListChecks, Play, Plus, Settings, Sparkles, Video, Wand2 } from "lucide-react";
import { analyze, health, record } from "./api";
import { useStore } from "./store";

const styles = [
  ["startup", "Startup Demo", "Clean and modern"],
  ["github", "GitHub Project", "Technical focus"],
  ["portfolio", "Portfolio", "Professional"],
  ["tutorial", "Tutorial", "Step by step"],
  ["launch", "Product Launch", "Marketing style"],
  ["social", "Social Media", "Short & engaging"]
] as const;

function App() {
  const state = useStore();
  const [view, setView] = useState("home");
  const [busy, setBusy] = useState(false);
  const [service, setService] = useState<"unknown" | "online" | "offline">("unknown");
  const [message, setMessage] = useState("");

  useEffect(() => {
    health()
      .then(() => setService("online"))
      .catch(() => setService("offline"));
  }, []);

  async function generate() {
    if (!state.url) return setMessage("Enter a website URL first.");
    setBusy(true);
    state.set({ status: "Analyzing website...", features: [], selected: [], videoPath: null, videoUrl: null });
    try {
      await health();
      setService("online");
      const data = await analyze(state.url, state.style, state.aspectRatio);
      state.set({
        status: `Analysis complete — ${data.features.length} features discovered`,
        features: data.features,
        selected: data.features.filter(f => f.importance === "high").map(f => f.id),
        runId: data.runId,
        plan: data.plan,
        pages: (data.result?.pages as unknown[]) || []
      });
      setView("features");
    } catch (e) {
      setService("offline");
      state.set({ status: "Analysis failed" });
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function createRecording() {
    const chosen = state.features.filter(f => state.selected.includes(f.id));
    if (!chosen.length) return setMessage("Select at least one feature.");
    setBusy(true);
    state.set({ status: "Recording selected workflows..." });
    try {
      const actions = chosen.flatMap(f => f.workflow);
      const data = await record(state.url, actions);
      state.set({
        status: data.mp4 ? "Showcase MP4 rendered" : (data.renderError || "Recording completed"),
        videoPath: data.mp4 || data.video,
        videoUrl: data.videoUrl
      });
      setView("videos");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Play size={20} fill="currentColor" /></div>
          <div><strong>Clipwise</strong><span>Product demo generator</span></div>
        </div>
        <nav>
          <button className={view === "home" ? "nav active" : "nav"} onClick={() => setView("home")}><Home size={18}/>Home</button>
          <button className={view === "new" ? "nav active" : "nav"} onClick={() => setView("new")}><Plus size={18}/>New Project</button>
          <button className={view === "features" ? "nav active" : "nav"} onClick={() => setView("features")}><ListChecks size={18}/>Feature Discovery</button>
          <button className={view === "videos" ? "nav active" : "nav"} onClick={() => setView("videos")}><Film size={18}/>My Videos</button>
          <button className={view === "templates" ? "nav active" : "nav"} onClick={() => setView("templates")}><Clapperboard size={18}/>Templates</button>
          <button className={view === "settings" ? "nav active" : "nav"} onClick={() => setView("settings")}><Settings size={18}/>Settings</button>
        </nav>
        <div className="local-card">
          <div className="online-dot" />
          <div><b>Local-first</b><span>Zero required API keys</span></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><span className="eyebrow">SHOWCASE GENERATOR</span><h1>Turn your product into a video.</h1></div>
          <div className="service-pill">
            <span className={service === "online" ? "dot online" : "dot"} />
            Browser engine {service === "online" ? "online" : service === "offline" ? "offline" : "ready"}
          </div>
        </header>

        {message && <div className="notice">{message}<button onClick={() => setMessage("")}>×</button></div>}

        {view === "home" && (
          <section>
            <div className="hero-card">
              <div>
                <div className="hero-badge"><Sparkles size={15}/> AI-powered website showcase</div>
                <h2>Give us a URL.<br/><span>Get a demo video.</span></h2>
                <p>Clipwise explores your website, finds meaningful workflows, records them, and turns the result into a polished product demo.</p>
              </div>
              <div className="hero-orb"><Wand2 size={54}/></div>
            </div>
            <div className="input-card">
              <label>Website URL</label>
              <div className="url-row">
                <Globe2 size={20}/>
                <input
                  value={state.url}
                  onChange={e => state.set({ url: e.target.value })}
                  placeholder="https://example.com"
                  onKeyDown={e => e.key === "Enter" && generate()}
                />
                <button className="primary" disabled={busy} onClick={generate}>
                  {busy ? "Analyzing..." : "Generate Showcase"}<ArrowRight size={18}/>
                </button>
              </div>
              <div className="examples">
                <span>Try:</span>
                <button onClick={() => state.set({ url: "https://example.com" })}>example.com</button>
              </div>
            </div>
            <div className="grid-3">
              <Info icon={<Globe2/>} title="Explore" text="Real Chromium browser automation with Playwright."/>
              <Info icon={<Gauge/>} title="Understand" text="Feature discovery plus optional local Ollama planning."/>
              <Info icon={<Video/>} title="Showcase" text="Record workflows and assemble a real video with FFmpeg."/>
            </div>
          </section>
        )}

        {view === "new" && <NewProject onGenerate={generate} busy={busy}/>}
        {view === "features" && <FeatureView onRecord={createRecording} busy={busy}/>}
        {view === "videos" && <VideoView/>}
        {view === "templates" && <Templates/>}
        {view === "settings" && <SettingsView/>}

        <footer><span>{state.status}</span><span>Clipwise V1 • Local-first</span></footer>
      </main>
    </div>
  );
}

function Info({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="info-card">
      <div className="icon-box">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function NewProject({ onGenerate, busy }: { onGenerate: () => void; busy: boolean }) {
  const s = useStore();
  return (
    <section>
      <div className="section-title">
        <div><span className="eyebrow">NEW PROJECT</span><h2>Configure your showcase</h2></div>
      </div>
      <div className="panel">
        <label>Project name</label>
        <input value={s.projectName} onChange={e => s.set({ projectName: e.target.value })} placeholder="My Product Demo"/>
        <label>Website URL</label>
        <input value={s.url} onChange={e => s.set({ url: e.target.value })} placeholder="https://example.com"/>
        <label>Video style</label>
        <div className="style-grid">
          {styles.map(([id, name, desc]) => (
            <button key={id} className={s.style === id ? "style selected" : "style"} onClick={() => s.set({ style: id })}>
              <b>{name}</b><span>{desc}</span>
            </button>
          ))}
        </div>
        <label>Aspect ratio</label>
        <div className="segmented">
          {(["16:9", "9:16", "1:1"] as const).map(x => (
            <button key={x} className={s.aspectRatio === x ? "selected" : ""} onClick={() => s.set({ aspectRatio: x })}>
              {x}
            </button>
          ))}
        </div>
        <button className="primary wide" disabled={busy} onClick={onGenerate}>
          {busy ? "Analyzing..." : "Analyze Website"}<ArrowRight size={18}/>
        </button>
      </div>
    </section>
  );
}

function FeatureView({ onRecord, busy }: { onRecord: () => void; busy: boolean }) {
  const s = useStore();
  return (
    <section>
      <div className="section-title">
        <div>
          <span className="eyebrow">DISCOVERY</span>
          <h2>Discovered features</h2>
          <p>{s.features.length} capabilities found on <b>{s.url}</b></p>
        </div>
        <button className="primary" disabled={busy || !s.features.length} onClick={onRecord}>
          <Video size={18}/>Record Showcase
        </button>
      </div>
      <div className="feature-grid">
        {s.features.map((f, i) => (
          <div
            className={s.selected.includes(f.id) ? "feature selected" : "feature"}
            key={f.id}
            onClick={() => s.toggleFeature(f.id)}
          >
            <div className="feature-top">
              <div className="number">{String(i + 1).padStart(2, "0")}</div>
              <span className={`importance ${f.importance}`}>{f.importance}</span>
            </div>
            <h3>{f.name}</h3>
            <p>{f.description}</p>
            <small>{Math.round(f.confidence * 100)}% confidence • {f.evidence[0]}</small>
            <div className="check"><CheckCircle2 size={18}/></div>
          </div>
        ))}
      </div>
      {!s.features.length && (
        <div className="empty">
          <ListChecks size={42}/>
          <h3>No analysis yet</h3>
          <p>Go to New Project or Home and analyze a URL.</p>
        </div>
      )}

      {s.pages && s.pages.length > 0 && (
        <div className="pages-preview-section">
          <h3>Explored Pages ({s.pages.length})</h3>
          <div className="pages-grid">
            {s.pages.map((rawPage, idx) => {
              const p = rawPage as { title?: string; url?: string; screenshotUrl?: string };
              return (
                <div key={idx} className="page-card">
                  {p.screenshotUrl ? (
                    <img src={p.screenshotUrl} alt={p.title || `Page ${idx + 1}`} className="page-thumb" />
                  ) : (
                    <div className="page-thumb-placeholder"><Globe2 size={24} /></div>
                  )}
                  <div className="page-info">
                    <strong title={p.title}>{p.title || "Untitled Page"}</strong>
                    <span title={p.url}>{p.url}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function VideoView() {
  const s = useStore();
  return (
    <section>
      <div className="section-title">
        <div><span className="eyebrow">OUTPUT</span><h2>Your showcase</h2></div>
      </div>
      <div className="video-panel">
        {s.videoUrl || s.videoPath ? (
          <div className="video-player-container">
            {s.videoUrl ? (
              <video controls autoPlay className="showcase-video-elem" src={s.videoUrl} />
            ) : (
              <div className="video-placeholder">
                <Film size={48}/>
                <b>Recording generated</b>
                <span>{s.videoPath}</span>
              </div>
            )}
            <div className="video-actions">
              {s.videoUrl && (
                <a className="primary" href={s.videoUrl} download="showcase.mp4" target="_blank" rel="noreferrer">
                  <Download size={18}/> Download Video
                </a>
              )}
              {s.videoPath && (
                <span className="video-filepath">Saved to: <code>{s.videoPath}</code></span>
              )}
            </div>
          </div>
        ) : (
          <div className="empty">
            <Video size={42}/>
            <h3>No video yet</h3>
            <p>Select features and record a showcase.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Templates() {
  return (
    <section>
      <div className="section-title">
        <div><span className="eyebrow">TEMPLATES</span><h2>Video styles</h2></div>
      </div>
      <div className="grid-3">
        {styles.map(([id, n, d]) => (
          <div className="info-card" key={id}>
            <div className="icon-box"><Clapperboard/></div>
            <h3>{n}</h3>
            <p>{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsView() {
  const [browserOnline, setBrowserOnline] = useState<boolean | null>(null);

  useEffect(() => {
    health()
      .then(() => setBrowserOnline(true))
      .catch(() => setBrowserOnline(false));
  }, []);

  return (
    <section>
      <div className="section-title">
        <div><span className="eyebrow">SETTINGS</span><h2>Local engine</h2></div>
      </div>
      <div className="panel">
        <div className="setting">
          <b>Browser service (Port 37771)</b>
          <span>{browserOnline === true ? "Online (Healthy)" : browserOnline === false ? "Offline" : "Checking..."}</span>
        </div>
        <div className="setting">
          <b>Ollama LLM</b>
          <span>Optional • http://127.0.0.1:11434 (Heuristic fallback active when unavailable)</span>
        </div>
        <div className="setting">
          <b>Model</b>
          <span>CLIPWISE_OLLAMA_MODEL or qwen2.5:3b</span>
        </div>
        <div className="setting">
          <b>Video renderer</b>
          <span>FFmpeg (Verified in PATH)</span>
        </div>
      </div>
    </section>
  );
}

export default App;
