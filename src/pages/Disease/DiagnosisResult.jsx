// src/pages/Disease/DiagnosisResult.jsx
import React from 'react';
import { theme } from '../../styles/theme';

const severityStyles = {
  Critical: { bg: '#4A1B0C', color: '#F0997B', border: '#D85A30' },
  High:     { bg: '#3D1A1A', color: '#F09595', border: '#E24B4A' },
  Moderate: { bg: '#3D2E0A', color: '#FAC775', border: '#BA7517' },
  Low:      { bg: '#1A3D1A', color: '#97C459', border: '#3B6D11' },
  Healthy:  { bg: '#1A4D2E', color: '#5DCAA5', border: '#0F6E56' },
};

const SeverityBadge = ({ severity }) => {
  const s = severityStyles[severity] || severityStyles.Low;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: 20, padding: '5px 12px',
      fontSize: 12, fontWeight: 500,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: s.color, display: 'inline-block',
        boxShadow: `0 0 6px ${s.color}`,
      }} />
      {severity} Risk
    </span>
  );
};

const Section = ({ icon, title, items, color }) => (
  <div style={{
    background: `${theme.earth}18`,
    border: `0.5px solid ${theme.earth}44`,
    borderRadius: 10, padding: '14px 16px',
  }}>
    <p style={{ color: theme.mist, fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 10, marginTop: 0 }}>
      {icon} {title}
    </p>
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{
            marginTop: 5, width: 6, height: 6, borderRadius: '50%',
            background: color, flexShrink: 0, display: 'inline-block',
          }} />
          <span style={{ color: theme.cream, fontSize: 13, lineHeight: 1.6 }}>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const DiagnosisResult = ({ result }) => {
  if (!result) return null;

  const confidencePct = result.confidence
    ? (result.confidence <= 1 ? result.confidence * 100 : result.confidence)
    : 0;

  const barColor = confidencePct > 80
    ? '#E24B4A'
    : confidencePct > 65
    ? '#EF9F27'
    : '#639922';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header — disease name + severity badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: theme.mist, fontSize: 11, letterSpacing: 1.5, marginBottom: 4, marginTop: 0 }}>
            DETECTED CONDITION
          </p>
          <h3 style={{
            color: theme.cream, fontSize: 22,
            fontFamily: "'Playfair Display', serif",
            margin: 0, lineHeight: 1.2,
          }}>
            {result.disease || 'Unknown'}
          </h3>
          {result.plant && (
            <p style={{ color: theme.mist, fontSize: 12, marginTop: 4, marginBottom: 0, opacity: 0.7 }}>
              Plant: {result.plant}
            </p>
          )}
        </div>
        {result.severity && <SeverityBadge severity={result.severity} />}
      </div>

      {/* Confidence bar */}
      {confidencePct > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: theme.mist, fontSize: 12 }}>AI Confidence Score</span>
            <span style={{ color: barColor, fontSize: 12, fontWeight: 600 }}>
              {confidencePct.toFixed(1)}%
            </span>
          </div>
          <div style={{ background: `${theme.earth}44`, borderRadius: 999, height: 7, overflow: 'hidden' }}>
            <div style={{
              width: `${confidencePct}%`,
              height: '100%',
              borderRadius: 999,
              background: `linear-gradient(90deg, #2D7A3F, ${barColor})`,
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>
      )}

      {/* Description */}
      {result.description && (
        <p style={{
          color: theme.cream, fontSize: 13, lineHeight: 1.7,
          background: `${theme.earth}15`,
          border: `0.5px solid ${theme.earth}33`,
          borderLeft: `3px solid #2D7A3F`,
          borderRadius: '0 8px 8px 0',
          padding: '10px 14px', margin: 0,
        }}>
          {result.description}
        </p>
      )}

      {/* Symptoms */}
      {result.symptoms?.length > 0 && (
        <Section icon="🔍" title="SYMPTOMS" items={result.symptoms} color="#EF9F27" />
      )}

      {/* Treatment */}
      {result.treatment?.length > 0 && (
        <Section icon="💊" title="TREATMENT" items={result.treatment} color="#E24B4A" />
      )}

      {/* Prevention */}
      {result.prevention?.length > 0 && (
        <Section icon="🛡️" title="PREVENTION" items={result.prevention} color="#2D7A3F" />
      )}

      {/* Fallback solution string (no parsed sections) */}
      {result.solution && !result.treatment?.length && (
        <div style={{
          background: `${theme.earth}18`,
          border: `0.5px solid ${theme.earth}44`,
          borderLeft: `3px solid #2D7A3F`,
          borderRadius: '0 10px 10px 0', padding: '14px 16px',
        }}>
          <p style={{ color: theme.mist, fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 8, marginTop: 0 }}>
            💊 RECOMMENDED TREATMENT
          </p>
          <p style={{ color: theme.cream, fontSize: 13, lineHeight: 1.7, margin: 0 }}>{result.solution}</p>
        </div>
      )}

      {/* ← Alternatives section added from File 2 — styled to match File 1 theme */}
      {result.alternatives?.length > 0 && (
        <div style={{
          background: `${theme.earth}18`,
          border: `0.5px solid ${theme.earth}44`,
          borderRadius: 10, padding: '14px 16px',
        }}>
          <p style={{ color: theme.mist, fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 10, marginTop: 0 }}>
            🔄 OTHER POSSIBLE CONDITIONS
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.alternatives.map((alt, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 10px',
                background: `${theme.earth}22`,
                borderRadius: 8,
                border: `0.5px solid ${theme.earth}33`,
              }}>
                <span style={{ color: theme.cream, fontSize: 13 }}>{alt.name}</span>
                <span style={{ color: theme.mist, fontSize: 12, fontWeight: 600 }}>
                  {(alt.confidence * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer (safe addition from File 2) */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'flex-start',
        background: `${theme.earth}11`,
        border: `0.5px solid ${theme.earth}33`,
        borderRadius: 8, padding: '10px 14px',
      }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>ℹ️</span>
        <p style={{ color: theme.mist, fontSize: 11, lineHeight: 1.6, margin: 0, opacity: 0.7 }}>
          AI-powered diagnosis for educational purposes only.
          Consult local agricultural experts for critical decisions.
        </p>
      </div>

    </div>
  );
};

export default DiagnosisResult;