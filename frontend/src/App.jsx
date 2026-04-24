import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const fieldStages = ["Planted", "Growing", "Ready", "Harvested"];

const emptyFieldForm = {
  name: "",
  cropType: "",
  plantingDate: "",
  currentStage: "Planted",
  assignedAgentId: ""
};

const emptyUpdateForm = {
  stage: "Planted",
  note: ""
};

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("smartseason_token") || "");
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(token));
  const [fieldForm, setFieldForm] = useState(emptyFieldForm);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [updateFieldId, setUpdateFieldId] = useState(null);
  const [updateForm, setUpdateForm] = useState(emptyUpdateForm);
  const [authForm, setAuthForm] = useState({ username: "", password: "" });

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let active = true;
    Promise.all([api.me(token), api.dashboard(token)])
      .then(async ([mePayload, dashboardPayload]) => {
        if (!active) return;
        setUser(mePayload.user);
        setDashboard(dashboardPayload);
        if (mePayload.user.role === "admin") {
          const agentsPayload = await api.agents(token);
          if (!active) return;
          setAgents(agentsPayload.items);
          setFieldForm((current) => ({
            ...current,
            assignedAgentId: current.assignedAgentId || agentsPayload.items[0]?.id?.toString() || ""
          }));
        }
        setError("");
      })
      .catch((requestError) => {
        if (!active) return;
        setToken("");
        localStorage.removeItem("smartseason_token");
        setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const statusCards = useMemo(() => {
    if (!dashboard) return [];
    const breakdown = dashboard.summary.statusBreakdown || {};
    return [
      { label: "Total fields", value: dashboard.summary.totalFields, tone: "default" },
      { label: "Active", value: breakdown.Active || 0, tone: "success" },
      { label: "At Risk", value: breakdown["At Risk"] || 0, tone: "warning" },
      { label: "Completed", value: breakdown.Completed || 0, tone: "muted" }
    ];
  }, [dashboard]);

  async function handleLogin(event) {
    event.preventDefault();
    try {
      setLoading(true);
      const payload = await api.login(authForm);
      setToken(payload.token);
      localStorage.setItem("smartseason_token", payload.token);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
      setLoading(false);
    }
  }

  async function refreshDashboard() {
    if (!token) return;
    const payload = await api.dashboard(token);
    setDashboard(payload);
  }

  async function handleFieldSubmit(event) {
    event.preventDefault();
    try {
      const payload = {
        ...fieldForm,
        assignedAgentId: Number(fieldForm.assignedAgentId)
      };
      if (editingFieldId) {
        await api.updateField(token, editingFieldId, payload);
      } else {
        await api.createField(token, payload);
      }
      setFieldForm({
        ...emptyFieldForm,
        currentStage: "Planted",
        assignedAgentId: agents[0]?.id?.toString() || ""
      });
      setEditingFieldId(null);
      await refreshDashboard();
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function startEditField(field) {
    setEditingFieldId(field.id);
    setFieldForm({
      name: field.name,
      cropType: field.cropType,
      plantingDate: field.plantingDate,
      currentStage: field.currentStage,
      assignedAgentId: field.assignedAgent.id.toString()
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleUpdateSubmit(event) {
    event.preventDefault();
    try {
      await api.createUpdate(token, updateFieldId, updateForm);
      setUpdateFieldId(null);
      setUpdateForm(emptyUpdateForm);
      await refreshDashboard();
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function logout() {
    setToken("");
    setUser(null);
    setDashboard(null);
    localStorage.removeItem("smartseason_token");
  }

  if (loading) {
    return <div className="app-shell"><div className="panel">Loading SmartSeason...</div></div>;
  }

  if (!token || !user || !dashboard) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="eyebrow">SmartSeason</p>
          <h1>Field Monitoring System</h1>
          {error ? <div className="alert">{error}</div> : null}
          <form onSubmit={handleLogin} className="stack">
            <label>
              Username
              <input
                value={authForm.username}
                onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                required
              />
            </label>
            <button type="submit">Sign in</button>
          </form>
          
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SmartSeason</p>
          <h2>{user.role === "admin" ? "Coordinator Dashboard" : "Field Agent Dashboard"}</h2>
          <p className="lede">{user.fullName}</p>
        </div>
        <button className="secondary" onClick={logout}>Logout</button>
      </header>

      {error ? <div className="alert">{error}</div> : null}

      <section className="hero">
        <div>
          <p className="eyebrow">{user.role === "admin" ? "All fields" : "Assigned fields"}</p>
          <h1>
            {user.role === "admin"
              ? "Track crop progress across the whole season."
              : "Capture what is happening in your fields today."}
          </h1>
          <p className="lede">
            {dashboard.summary.riskFieldNames.length > 0
              ? `Needs attention: ${dashboard.summary.riskFieldNames.join(", ")}`
              : "No fields are currently flagged as at risk."}
          </p>
        </div>
      </section>

      <section className="stats-grid">
        {statusCards.map((card) => (
          <article className={`stat-card ${card.tone}`} key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      {user.role === "admin" ? (
        <section className="workspace-grid">
          <div className="panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Field Management</p>
                <h3>{editingFieldId ? "Edit field" : "Create field"}</h3>
              </div>
            </div>
            <form onSubmit={handleFieldSubmit} className="stack two-column">
              <label>
                Field name
                <input value={fieldForm.name} onChange={(event) => setFieldForm({ ...fieldForm, name: event.target.value })} required />
              </label>
              <label>
                Crop type
                <input value={fieldForm.cropType} onChange={(event) => setFieldForm({ ...fieldForm, cropType: event.target.value })} required />
              </label>
              <label>
                Planting date
                <input type="date" value={fieldForm.plantingDate} onChange={(event) => setFieldForm({ ...fieldForm, plantingDate: event.target.value })} required />
              </label>
              <label>
                Stage
                <select value={fieldForm.currentStage} onChange={(event) => setFieldForm({ ...fieldForm, currentStage: event.target.value })}>
                  {fieldStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                </select>
              </label>
              <label>
                Assigned agent
                <select value={fieldForm.assignedAgentId} onChange={(event) => setFieldForm({ ...fieldForm, assignedAgentId: event.target.value })}>
                  {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.fullName}</option>)}
                </select>
              </label>
              <div className="button-row">
                <button type="submit">{editingFieldId ? "Save changes" : "Create field"}</button>
                {editingFieldId ? <button type="button" className="secondary" onClick={() => {
                  setEditingFieldId(null);
                  setFieldForm({
                    ...emptyFieldForm,
                    assignedAgentId: agents[0]?.id?.toString() || ""
                  });
                }}>Cancel</button> : null}
              </div>
            </form>
          </div>

          <div className="panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Recent activity</p>
                <h3>Agent updates</h3>
              </div>
            </div>
            <div className="timeline">
              {dashboard.recentUpdates.map((update) => (
                <article className="timeline-item" key={update.id}>
                  <strong>{update.fieldName}</strong>
                  <p>{update.agentName} marked it as {update.stage}</p>
                  <p className="muted">{update.note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">{user.role === "admin" ? "Operations" : "Assigned portfolio"}</p>
            <h3>{user.role === "admin" ? "All fields" : "Your fields"}</h3>
          </div>
        </div>

        <div className="field-list">
          {dashboard.fields.map((field) => (
            <article className="field-card" key={field.id}>
              <div className="field-card-top">
                <div>
                  <h4>{field.name}</h4>
                  <p>{field.cropType} planted on {field.plantingDate}</p>
                </div>
                <div className={`status-badge ${field.status.toLowerCase().replace(" ", "-")}`}>{field.status}</div>
              </div>
              <div className="chip-row">
                <span className="chip">{field.currentStage}</span>
                <span className="chip">Agent: {field.assignedAgent.fullName}</span>
              </div>
              {field.updates[0] ? <p className="muted">Latest note: {field.updates[0].note}</p> : <p className="muted">No updates yet.</p>}
              {user.role === "admin" ? (
                <button className="secondary" onClick={() => startEditField(field)}>Edit field</button>
              ) : (
                <button className="secondary" onClick={() => {
                  setUpdateFieldId(field.id);
                  setUpdateForm({ stage: field.currentStage, note: "" });
                }}>
                  Add update
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      {user.role === "agent" && updateFieldId ? (
        <section className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Field update</p>
              <h3>Submit observation</h3>
            </div>
          </div>
          <form onSubmit={handleUpdateSubmit} className="stack">
            <label>
              Stage
              <select value={updateForm.stage} onChange={(event) => setUpdateForm({ ...updateForm, stage: event.target.value })}>
                {fieldStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
              </select>
            </label>
            <label>
              Observation note
              <textarea
                rows="5"
                value={updateForm.note}
                onChange={(event) => setUpdateForm({ ...updateForm, note: event.target.value })}
                placeholder="Describe crop health, pest issues, weather effects, or actions needed."
                required
              />
            </label>
            <div className="button-row">
              <button type="submit">Submit update</button>
              <button type="button" className="secondary" onClick={() => setUpdateFieldId(null)}>Cancel</button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}

export default App;
