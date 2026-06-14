import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Search, Printer, ArrowLeft, X as XIcon, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { notify } from '../lib/notify';

/* ============================================================
   QR PRINT PAGE — Hoja carta con credenciales tipo CR80
   ------------------------------------------------------------
   • Pantalla: filtros + grid responsive (mobile-first)
   • Print:    @page letter, grid 2 × 5 (10 credenciales / hoja)
   • B/N puro: keywords CSS `black` / `white` (no hex, no grises)
   ============================================================ */

const ITEMS_PER_PAGE_PRINT = 6; // 2 columnas × 3 filas

/* ─── Helpers ─────────────────────────────────────────────── */
const parseRuta = (ruta) => {
  if (!ruta) return { code: '—', desc: '—' };
  const m = ruta.match(/^(R\d+)[\s\-:]*(.*)$/i);
  if (m) return { code: m[1].toUpperCase(), desc: (m[2] || '').trim() || '—' };
  return { code: ruta, desc: '—' };
};

const splitName = (full) => {
  if (!full) return { apellidos: '', nombres: '' };
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return { apellidos: '', nombres: parts.join(' ') };
  if (parts.length === 2) return { apellidos: parts[0], nombres: parts[1] };
  return { apellidos: parts.slice(0, 2).join(' '), nombres: parts.slice(2).join(' ') };
};

/* ─── Credencial individual ───────────────────────────────── */
const QrCard = ({ emp }) => {
  const { apellidos, nombres } = splitName(emp.nombre);
  const ruta = parseRuta(emp.ruta);

  return (
    <article
      data-testid={`qr-card-${emp.numero_empleado}`}
      className="vp-qr-card"
      aria-label={`Credencial de ${emp.nombre}`}
    >
      {/* QR */}
      <div className="vp-qr-frame" aria-hidden="true">
        {emp.qr_code ? (
          <img src={emp.qr_code} alt="" className="vp-qr-img" />
        ) : (
          <div className="vp-qr-missing">SIN QR</div>
        )}
      </div>

      {/* Datos */}
      <div className="vp-qr-data">
        <p className="vp-qr-num">#{emp.numero_empleado}</p>
        {apellidos && <p className="vp-qr-surname">{apellidos}</p>}
        <p className="vp-qr-name">{nombres}</p>
        <div className="vp-qr-meta">
          <span className="vp-qr-meta-cell"><b>RUTA</b> {ruta.code}</span>
          <span className="vp-qr-meta-sep" aria-hidden="true">·</span>
          <span className="vp-qr-meta-cell"><b>TURNO</b> {emp.turno || '—'}</span>
        </div>
      </div>
    </article>
  );
};

/* ─── Página principal ────────────────────────────────────── */
export const QrPrintPage = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [rutaFilter, setRutaFilter]   = useState('');
  const [turnoFilter, setTurnoFilter] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('empleados')
        .select('id, numero_empleado, nombre, turno, ruta, qr_code')
        .order('ruta', { ascending: true })
        .order('nombre', { ascending: true });

      if (error) {
        notify.error('No se pudieron cargar los empleados', { description: error.message });
        setEmployees([]);
      } else {
        setEmployees(data || []);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  /* ── Filtros ── */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (q && !(
        (e.nombre || '').toLowerCase().includes(q) ||
        String(e.numero_empleado || '').toLowerCase().includes(q)
      )) return false;
      if (rutaFilter && parseRuta(e.ruta).code !== rutaFilter) return false;
      if (turnoFilter && String(e.turno || '') !== turnoFilter) return false;
      return true;
    });
  }, [employees, query, rutaFilter, turnoFilter]);

  const withQr      = filtered.filter((e) => e.qr_code);
  const withoutQr   = filtered.length - withQr.length;

  /* ── Opciones para filtros ── */
  const rutaOptions = useMemo(() => {
    const set = new Set(employees.map((e) => parseRuta(e.ruta).code).filter((c) => c && c !== '—'));
    return Array.from(set).sort();
  }, [employees]);

  const turnoOptions = useMemo(() => {
    const set = new Set(employees.map((e) => String(e.turno || '').trim()).filter(Boolean));
    return Array.from(set).sort();
  }, [employees]);

  /* ── Acciones ── */
  const handlePrint = () => {
    if (withQr.length === 0) {
      notify.warning('Nada que imprimir', { description: 'No hay empleados con QR en la selección.' });
      return;
    }
    window.print();
  };

  const clearFilters = () => { setQuery(''); setRutaFilter(''); setTurnoFilter(''); };

  /* ── Render ── */
  const totalPages = Math.ceil(withQr.length / ITEMS_PER_PAGE_PRINT);

  return (
    <>
      <PrintStyles />

      <section data-testid="qr-print-page" style={S.page} aria-labelledby="qr-print-title">

        {/* ── Toolbar (oculto al imprimir) ── */}
        <div className="vp-no-print" style={S.toolbar}>
          <div style={S.toolbarHead}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/empresa')}
              data-testid="qr-print-back"
              aria-label="Volver a Empresa"
              style={S.backBtn}
            >
              <ArrowLeft size={14} strokeWidth={2} />
              Volver
            </motion.button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 id="qr-print-title" style={S.title}>Imprimir credenciales</h1>
              <p style={S.subtitle} data-testid="qr-print-meta">
                {loading ? '—' : (
                  <>
                    <strong>{withQr.length}</strong> credencial{withQr.length === 1 ? '' : 'es'}
                    {withoutQr > 0 && <> · <span style={S.warning}>{withoutQr} sin QR</span></>}
                    {totalPages > 0 && <> · {totalPages} hoja{totalPages === 1 ? '' : 's'} carta</>}
                  </>
                )}
              </p>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handlePrint}
              disabled={loading || withQr.length === 0}
              data-testid="qr-print-action"
              style={{
                ...S.printBtn,
                opacity: loading || withQr.length === 0 ? 0.5 : 1,
                cursor:  loading || withQr.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <Printer size={15} strokeWidth={1.75} />
              Imprimir
            </motion.button>
          </div>

          {/* Filtros */}
          <div style={S.filters}>
            <label style={S.searchWrap}>
              <Search size={15} strokeWidth={1.75} style={S.searchIcon} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o número…"
                aria-label="Buscar empleado"
                data-testid="qr-print-search"
                style={S.searchInput}
              />
            </label>

            <select
              value={rutaFilter}
              onChange={(e) => setRutaFilter(e.target.value)}
              aria-label="Filtrar por ruta"
              data-testid="qr-print-ruta"
              style={S.select}
            >
              <option value="">Todas las rutas</option>
              {rutaOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>

            <select
              value={turnoFilter}
              onChange={(e) => setTurnoFilter(e.target.value)}
              aria-label="Filtrar por turno"
              data-testid="qr-print-turno"
              style={S.select}
            >
              <option value="">Todos los turnos</option>
              {turnoOptions.map((t) => <option key={t} value={t}>Turno {t}</option>)}
            </select>

            {(query || rutaFilter || turnoFilter) && (
              <button
                type="button"
                onClick={clearFilters}
                aria-label="Limpiar filtros"
                data-testid="qr-print-clear"
                style={S.clearBtn}
              >
                <XIcon size={14} strokeWidth={2} />
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* ── Hint impresión (solo pantalla) ── */}
        <div className="vp-no-print" style={S.hintBox} role="note">
          <p style={S.hintTitle}>Antes de imprimir</p>
          <ul style={S.hintList}>
            <li>Hoja tamaño <strong>carta</strong> · márgenes mínimos en el diálogo de impresión.</li>
            <li>Activa la opción <strong>"Imprimir gráficos de fondo"</strong> en algunos navegadores.</li>
            <li>Se imprimirán <strong>{ITEMS_PER_PAGE_PRINT} credenciales por hoja</strong> en blanco y negro.</li>
          </ul>
        </div>

        {/* ── Sin QR (advertencia) ── */}
        {!loading && withoutQr > 0 && (
          <div className="vp-no-print" style={S.warnBox} role="alert" data-testid="qr-print-warning">
            Hay {withoutQr} empleado{withoutQr === 1 ? '' : 's'} sin código QR generado. No aparecerán en la impresión.
          </div>
        )}

        {/* ── Skeleton ── */}
        {loading && (
          <div className="vp-no-print" style={S.skeletonWrap}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={S.skeletonCard} />
            ))}
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && withQr.length === 0 && (
          <div className="vp-no-print" role="status" data-testid="qr-print-empty" style={S.empty}>
            <div style={S.emptyIcon} aria-hidden="true">
              <Users size={22} strokeWidth={1.5} />
            </div>
            <p style={S.emptyTitle}>Sin credenciales</p>
            <p style={S.emptySub}>
              No hay empleados con QR que coincidan con los filtros aplicados.
            </p>
          </div>
        )}

        {/* ── Sheet container ── */}
        {!loading && withQr.length > 0 && (
          <div className="vp-print-area" data-testid="qr-print-sheet">
            {Array.from({ length: totalPages }, (_, pageIdx) => {
              const slice = withQr.slice(
                pageIdx * ITEMS_PER_PAGE_PRINT,
                (pageIdx + 1) * ITEMS_PER_PAGE_PRINT
              );
              return (
                <section key={pageIdx} className="vp-print-sheet" aria-label={`Hoja ${pageIdx + 1}`}>
                  <div className="vp-print-grid">
                    {slice.map((emp) => (
                      <QrCard key={emp.id} emp={emp} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
};

/* ============================================================
   PRINT-SPECIFIC STYLES
   ============================================================ */
const PrintStyles = () => (
  <style>{`
    @page {
      size: letter;
      margin: 10mm;
    }

    /* ── Sheet container ───────────────────────────────────── */
    .vp-print-area {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xl);
    }

    .vp-print-sheet {
      background: white;
      border: 1px solid var(--color-hairline-soft);
      border-radius: var(--rounded-md);
      padding: 10mm;
      box-sizing: border-box;
    }

    .vp-print-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 5mm;
      width: 100%;
    }

    /* ── Credencial (CR80 ampliada — 6 por hoja) ───────────── */
    .vp-qr-card {
      box-sizing: border-box;
      width: 100%;
      min-height: 78mm;
      padding: 4mm;
      border: 1.5pt solid black;
      border-radius: 3mm;
      background: white;
      display: grid;
      grid-template-columns: 38mm minmax(0, 1fr);
      gap: 3mm;
      align-items: center;
      page-break-inside: avoid;
      break-inside: avoid;
      color: black;
    }

    .vp-qr-frame {
      width: 38mm;
      height: 38mm;
      background: white;
      border: 1pt solid black;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1mm;
    }

    .vp-qr-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      filter: grayscale(100%) contrast(1.2);
    }

    .vp-qr-missing {
      font-family: var(--font-display);
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: black;
    }

    .vp-qr-data {
      display: flex;
      flex-direction: column;
      gap: 1mm;
      min-width: 0;
      color: black;
    }

    .vp-qr-num {
      margin: 0;
      font-family: var(--font-display);
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.12em;
      font-variant-numeric: tabular-nums;
      color: black;
    }

    .vp-qr-surname {
      margin: 0;
      font-family: var(--font-body);
      font-size: 9pt;
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: black;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .vp-qr-name {
      margin: 0;
      font-family: var(--font-display);
      font-size: 12pt;
      font-weight: 700;
      letter-spacing: -0.01em;
      text-transform: uppercase;
      line-height: 1.1;
      color: black;
      word-break: break-word;
      overflow-wrap: anywhere;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .vp-qr-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1.5mm;
      margin-top: 1.5mm;
      padding-top: 1.5mm;
      border-top: 0.5pt solid black;
      font-family: var(--font-body);
      font-size: 8pt;
      color: black;
    }
    .vp-qr-meta-cell {
      display: inline-flex;
      align-items: baseline;
      gap: 1mm;
      white-space: nowrap;
    }
    .vp-qr-meta b {
      font-family: var(--font-display);
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .vp-qr-meta-sep {
      opacity: 0.6;
    }

    /* ── Pantalla (preview) ────────────────────────────────── */
    @media screen {
      .vp-print-area {
        margin-top: var(--spacing-lg);
      }
      .vp-print-sheet {
        background: white;
        border-radius: var(--rounded-md);
        max-width: 100%;
        margin: 0 auto;
        box-shadow: 0 1px 0 var(--color-hairline-soft);
      }
      /* Vista compacta en pantalla: una columna en móvil */
      @media (max-width: 640px) {
        .vp-print-grid { grid-template-columns: 1fr; grid-template-rows: none; gap: var(--spacing-sm); }
        .vp-qr-card { min-height: auto; grid-template-columns: 32mm minmax(0, 1fr); padding: 3mm; gap: 3mm; }
        .vp-qr-frame { width: 32mm; height: 32mm; }
        .vp-qr-name { font-size: 11pt; }
      }
    }

    /* ── Impresión ─────────────────────────────────────────── */
    @media print {
      :root, html, body {
        background: white !important;
        color: black !important;
      }
      .vp-no-print { display: none !important; }
      .vp-print-area {
        gap: 0;
        margin: 0;
      }
      .vp-print-sheet {
        border: none !important;
        box-shadow: none !important;
        padding: 0;
        page-break-after: always;
        break-after: page;
      }
      .vp-print-sheet:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      .vp-qr-card {
        background: white !important;
        color: black !important;
        border-color: black !important;
        box-shadow: none !important;
      }
      /* Asegurar que se imprimen los fondos blancos y los QR negros */
      .vp-qr-img {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        color-adjust: exact;
      }
    }
  `}</style>
);

/* ============================================================
   STYLES — pantalla (toolbar, filtros, skeletons, empty)
   ============================================================ */
const S = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-lg)',
  },

  /* Toolbar */
  toolbar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-base)',
  },
  toolbarHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    flexWrap: 'wrap',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-xxs)',
    minHeight: '2.25rem',
    padding: '0 var(--spacing-sm)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline-soft)',
    background: 'transparent',
    color: 'var(--color-muted)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    fontWeight: 500,
    cursor: 'pointer',
  },
  title: {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(var(--typography-title-md-size), 4vw, var(--typography-display-sm-size))',
    fontWeight: 'var(--typography-title-md-weight)',
    color: 'var(--color-ink)',
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
  },
  subtitle: {
    margin: 'var(--spacing-xxs) 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    color: 'var(--color-muted)',
  },
  warning: {
    color: 'var(--color-semantic-warning)',
    fontWeight: 600,
  },
  printBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    minHeight: '2.5rem',
    padding: '0 var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: 'none',
    background: 'var(--color-accent)',
    color: 'var(--color-on-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 120ms ease',
  },

  /* Filtros */
  filters: {
    display: 'flex',
    gap: 'var(--spacing-xs)',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchWrap: {
    position: 'relative',
    flex: '1 1 14rem',
    minWidth: '12rem',
  },
  searchIcon: {
    position: 'absolute',
    left: 'var(--spacing-sm)',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--color-muted-soft)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    minHeight: '2.5rem',
    paddingLeft: '2.25rem',
    paddingRight: 'var(--spacing-base)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    color: 'var(--color-ink)',
    background: 'var(--color-canvas-soft)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-md)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    minHeight: '2.5rem',
    padding: '0 var(--spacing-base)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    color: 'var(--color-ink)',
    background: 'var(--color-canvas-soft)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-md)',
    outline: 'none',
    cursor: 'pointer',
  },
  clearBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-xxs)',
    minHeight: '2.5rem',
    padding: '0 var(--spacing-sm)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline)',
    background: 'transparent',
    color: 'var(--color-muted)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    fontWeight: 500,
    cursor: 'pointer',
  },

  /* Hint */
  hintBox: {
    padding: 'var(--spacing-base) var(--spacing-lg)',
    border: '1px dashed var(--color-hairline-strong)',
    borderRadius: 'var(--rounded-md)',
    background: 'var(--color-canvas-soft)',
  },
  hintTitle: {
    margin: '0 0 var(--spacing-xs)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-uppercase-size)',
    fontWeight: 'var(--typography-caption-uppercase-weight)',
    letterSpacing: 'var(--typography-caption-uppercase-ls)',
    textTransform: 'uppercase',
    color: 'var(--color-muted)',
  },
  hintList: {
    margin: 0,
    paddingLeft: '1.2rem',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    lineHeight: 1.55,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xxs)',
  },

  /* Warn box */
  warnBox: {
    padding: 'var(--spacing-sm) var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    background: 'rgb(var(--color-semantic-warning-raw) / 0.08)',
    border: '1px solid rgb(var(--color-semantic-warning-raw) / 0.3)',
    color: 'var(--color-semantic-warning)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
  },

  /* Skeleton */
  skeletonWrap: {
    display: 'grid',
    gap: 'var(--spacing-sm)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 18rem), 1fr))',
  },
  skeletonCard: {
    height: '4rem',
    borderRadius: 'var(--rounded-md)',
    background: 'var(--color-hairline-soft)',
    animation: 'vp-emp-pulse 1.4s ease-in-out infinite',
  },

  /* Empty */
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-xxl) var(--spacing-lg)',
    textAlign: 'center',
  },
  emptyIcon: {
    width: '3rem', height: '3rem', borderRadius: '50%',
    background: 'rgb(var(--color-accent-raw) / 0.08)',
    color: 'var(--color-accent)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 'var(--spacing-xxs)',
  },
  emptyTitle: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    color: 'var(--color-ink)',
  },
  emptySub: {
    margin: 0,
    maxWidth: '20rem',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    lineHeight: 'var(--typography-caption-lh)',
  },
};
