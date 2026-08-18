/* @ds-bundle: {"format":4,"namespace":"ArroshoDesignSystem_6655bd","components":[{"name":"LogoMark","sourcePath":"components/brand/LogoMark.jsx"},{"name":"StreamBackground","sourcePath":"components/brand/StreamBackground.jsx"},{"name":"Wordmark","sourcePath":"components/brand/Wordmark.jsx"},{"name":"FeatureItem","sourcePath":"components/cards/FeatureItem.jsx"},{"name":"PointCard","sourcePath":"components/cards/PointCard.jsx"},{"name":"StepCard","sourcePath":"components/cards/StepCard.jsx"},{"name":"TrackCard","sourcePath":"components/cards/TrackCard.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Eyebrow","sourcePath":"components/core/Eyebrow.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"Pill","sourcePath":"components/core/Pill.jsx"},{"name":"StickyBar","sourcePath":"components/core/StickyBar.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"AccordionItem","sourcePath":"components/disclosure/Accordion.jsx"},{"name":"Accordion","sourcePath":"components/disclosure/Accordion.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"Section","sourcePath":"components/layout/Section.jsx"},{"name":"SectionHeading","sourcePath":"components/layout/SectionHeading.jsx"},{"name":"BackLink","sourcePath":"components/legal/BackLink.jsx"},{"name":"DisclaimerBox","sourcePath":"components/legal/DisclaimerBox.jsx"},{"name":"LegalClause","sourcePath":"components/legal/LegalClause.jsx"},{"name":"Placeholder","sourcePath":"components/legal/Placeholder.jsx"}],"sourceHashes":{"components/brand/LogoMark.jsx":"0829cf075dbd","components/brand/StreamBackground.jsx":"de5fdeb13b8e","components/brand/Wordmark.jsx":"a93892416f7e","components/cards/FeatureItem.jsx":"0527a9b51073","components/cards/PointCard.jsx":"7eb1392a4cb4","components/cards/StepCard.jsx":"ac9e4493835d","components/cards/TrackCard.jsx":"86c61b831dc6","components/core/Button.jsx":"69dd454fc3c3","components/core/Eyebrow.jsx":"e0c0966799e7","components/core/Icon.jsx":"fc65ea2dfafc","components/core/Pill.jsx":"ca5164aadc3c","components/core/StickyBar.jsx":"49dec4ec10c2","components/core/Tag.jsx":"31018c161886","components/disclosure/Accordion.jsx":"2391b102e42b","components/forms/Field.jsx":"2dd545f38f0f","components/layout/Section.jsx":"565378af6742","components/layout/SectionHeading.jsx":"1619d15d8148","components/legal/BackLink.jsx":"b5a69235fddc","components/legal/DisclaimerBox.jsx":"b697a19af597","components/legal/LegalClause.jsx":"48edd8341abe","components/legal/Placeholder.jsx":"95358fc11d12","ui_kits/website/Home.jsx":"4eb0a52fcd5c","ui_kits/website/HomeownerBreakdown.jsx":"ca126310c66c","ui_kits/website/Terms.jsx":"2c5c38573819"},"inlinedExternals":[],"unexposedExports":[{"name":"arroshoIconPaths","sourcePath":"components/core/Icon.jsx"}]} */

(() => {

const __ds_ns = (window.ArroshoDesignSystem_6655bd = window.ArroshoDesignSystem_6655bd || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/LogoMark.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function LogoMark({
  size = 64,
  color = 'var(--arr-ink)',
  streamColor = 'var(--arr-teal)',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 500 500",
    xmlns: "http://www.w3.org/2000/svg",
    role: "img",
    "aria-label": "Arrosho",
    style: {
      display: 'block',
      width: size,
      height: size,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("polygon", {
    points: "222,70 278,70 391.5,430 315.5,430 250,155 184.5,430 108.5,430",
    fill: color
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 54.62,362.98 C 60.20,357.39 66.74,335.87 88.09,329.47 C 109.43,323.07 155.75,336.56 182.67,324.57 C 209.59,312.59 222.68,269.54 249.60,257.56 C 276.52,245.57 321.69,256.48 344.19,252.66 C 368.00,248.60 381.50,219.00 392.00,204.50",
    fill: "none",
    stroke: streamColor,
    strokeWidth: "17.5",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 72.37,370.86 C 77.29,365.94 83.07,346.94 101.90,341.30 C 120.73,335.65 161.61,347.55 185.36,336.98 C 209.11,326.40 220.66,288.42 244.41,277.85 C 268.16,267.27 308.02,276.89 327.87,273.53 C 354.00,268.50 375.00,224.00 392.00,204.50",
    fill: "none",
    stroke: streamColor,
    strokeWidth: "13.75",
    strokeLinecap: "round",
    opacity: "0.75"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 89.12,378.75 C 93.39,374.48 98.39,358.02 114.71,353.12 C 131.03,348.23 166.46,358.55 187.04,349.38 C 207.63,340.22 217.64,307.30 238.22,298.13 C 258.81,288.97 293.35,297.31 310.55,294.39 C 340.00,289.00 368.00,238.00 392.00,204.50",
    fill: "none",
    stroke: streamColor,
    strokeWidth: "11.25",
    strokeLinecap: "round",
    opacity: "0.5"
  }));
}
Object.assign(__ds_scope, { LogoMark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/LogoMark.jsx", error: String((e && e.message) || e) }); }

// components/brand/StreamBackground.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const PRESETS = {
  hero: {
    viewBox: '0 0 1200 800',
    paths: [['M-20,560 C 150,520 220,610 340,580 C 460,550 520,640 660,600 C 800,560 860,650 1000,610 C 1100,585 1160,610 1230,590', 2, 0.16], ['M-20,610 C 140,660 240,600 360,630 C 480,660 560,590 690,625 C 820,660 900,600 1020,635 C 1110,660 1170,630 1230,650', 1.5, 0.1], ['M-20,505 C 160,470 210,540 330,515 C 460,488 540,545 650,520 C 780,492 850,545 980,520 C 1080,500 1150,520 1230,505', 1.5, 0.09]]
  },
  band: {
    viewBox: '0 0 1200 700',
    paths: [['M-20,95 C 150,125 220,68 350,98 C 480,127 550,72 680,102 C 810,130 880,75 1010,102 C 1100,120 1160,104 1230,110', 2, 0.1], ['M-20,625 C 160,595 240,645 380,618 C 520,592 590,638 730,612 C 860,588 930,632 1060,610 C 1130,598 1180,610 1230,604', 2, 0.11]]
  },
  wide: {
    viewBox: '0 0 1200 900',
    paths: [['M-20,120 C 160,150 220,90 360,115 C 500,140 560,85 700,110 C 840,135 900,85 1040,105 C 1130,118 1180,110 1230,115', 2, 0.14], ['M-20,800 C 150,770 230,830 370,800 C 510,770 580,825 720,800 C 850,777 920,825 1050,800 C 1130,785 1180,800 1230,790', 2, 0.13]]
  }
};
function StreamBackground({
  preset = 'band',
  color = 'var(--arr-steel)',
  style,
  ...rest
}) {
  const p = PRESETS[preset] || PRESETS.band;
  return /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: p.viewBox,
    preserveAspectRatio: "none",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 0,
      ...style
    }
  }, rest), p.paths.map(([d, w, o], i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: d,
    stroke: color,
    strokeWidth: w,
    opacity: o
  })));
}
Object.assign(__ds_scope, { StreamBackground });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/StreamBackground.jsx", error: String((e && e.message) || e) }); }

// components/brand/Wordmark.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Wordmark({
  width = 230,
  color = 'var(--arr-white)',
  streamColor = 'var(--arr-teal)',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "-6.6 0 1874.1 500",
    xmlns: "http://www.w3.org/2000/svg",
    role: "img",
    "aria-label": "Arrosho",
    style: {
      display: 'block',
      width,
      height: 'auto',
      color,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("g", {
    transform: "translate(-8,23) scale(0.9)"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "222,70 278,70 391.5,430 315.5,430 250,155 184.5,430 108.5,430",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 54.62,362.98 C 60.20,357.39 66.74,335.87 88.09,329.47 C 109.43,323.07 155.75,336.56 182.67,324.57 C 209.59,312.59 222.68,269.54 249.60,257.56 C 276.52,245.57 321.69,256.48 344.19,252.66 C 368.00,248.60 381.50,219.00 392.00,204.50",
    fill: "none",
    stroke: streamColor,
    strokeWidth: "17.5",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 72.37,370.86 C 77.29,365.94 83.07,346.94 101.90,341.30 C 120.73,335.65 161.61,347.55 185.36,336.98 C 209.11,326.40 220.66,288.42 244.41,277.85 C 268.16,267.27 308.02,276.89 327.87,273.53 C 354.00,268.50 375.00,224.00 392.00,204.50",
    fill: "none",
    stroke: streamColor,
    strokeWidth: "13.75",
    strokeLinecap: "round",
    opacity: "0.75"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 89.12,378.75 C 93.39,374.48 98.39,358.02 114.71,353.12 C 131.03,348.23 166.46,358.55 187.04,349.38 C 207.63,340.22 217.64,307.30 238.22,298.13 C 258.81,288.97 293.35,297.31 310.55,294.39 C 340.00,289.00 368.00,238.00 392.00,204.50",
    fill: "none",
    stroke: streamColor,
    strokeWidth: "11.25",
    strokeLinecap: "round",
    opacity: "0.5"
  })), /*#__PURE__*/React.createElement("g", {
    transform: "translate(392,0)"
  }, /*#__PURE__*/React.createElement("polygon", {
    fill: "currentColor",
    points: "0,90 47,90 47,238 65,410 0,410"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    d: "M 47,90 L 138,90 Q 196,90 196,148 L 196,180 Q 196,238 138,238 L 47,238 L 47,192 L 124,192 Q 150,192 150,164 Q 150,136 124,136 L 47,136 Z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    d: "M 100,220 L 149,220 L 210,410 L 145,410 Z"
  })), /*#__PURE__*/React.createElement("g", {
    transform: "translate(646,0)"
  }, /*#__PURE__*/React.createElement("polygon", {
    fill: "currentColor",
    points: "0,90 47,90 47,238 65,410 0,410"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    d: "M 47,90 L 138,90 Q 196,90 196,148 L 196,180 Q 196,238 138,238 L 47,238 L 47,192 L 124,192 Q 150,192 150,164 Q 150,136 124,136 L 47,136 Z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    d: "M 100,220 L 149,220 L 210,410 L 145,410 Z"
  })), /*#__PURE__*/React.createElement("g", {
    transform: "translate(900,0)"
  }, /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    fillRule: "evenodd",
    d: "M 0,150 Q 0,86 64,86 L 136,86 Q 200,86 200,150 L 200,350 Q 200,414 136,414 L 64,414 Q 0,414 0,350 Z M 52,163 Q 52,127 79,127 L 121,127 Q 148,127 148,163 L 148,337 Q 148,373 121,373 L 79,373 Q 52,373 52,337 Z"
  })), /*#__PURE__*/React.createElement("g", {
    transform: "translate(1146,0)"
  }, /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    d: "M 190,163 L 143,163 Q 143,133 113,133 L 77,133 Q 47,133 47,163 L 47,197 Q 47,227 77,227 L 143,227 Q 190,227 190,274 L 190,340 Q 190,410 120,410 L 60,410 Q 0,410 0,350 L 0,320 L 47,320 L 47,347 Q 47,367 77,367 L 120,367 Q 143,367 143,337 L 143,303 Q 143,273 113,273 L 47,273 Q 0,273 0,226 L 0,160 Q 0,90 70,90 L 130,90 Q 190,90 190,150 Z"
  })), /*#__PURE__*/React.createElement("g", {
    transform: "translate(1380,0)"
  }, /*#__PURE__*/React.createElement("polygon", {
    fill: "currentColor",
    points: "0,90 47,90 65,410 0,410"
  }), /*#__PURE__*/React.createElement("polygon", {
    fill: "currentColor",
    points: "135,90 200,90 200,410 153,410"
  }), /*#__PURE__*/React.createElement("polygon", {
    fill: "currentColor",
    points: "52,226 145,226 148,274 55,274"
  })), /*#__PURE__*/React.createElement("g", {
    transform: "translate(1627,0)"
  }, /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    fillRule: "evenodd",
    d: "M 0,150 Q 0,86 64,86 L 136,86 Q 200,86 200,150 L 200,350 Q 200,414 136,414 L 64,414 Q 0,414 0,350 Z M 52,163 Q 52,127 79,127 L 121,127 Q 148,127 148,163 L 148,337 Q 148,373 121,373 L 79,373 Q 52,373 52,337 Z"
  })));
}
Object.assign(__ds_scope, { Wordmark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Wordmark.jsx", error: String((e && e.message) || e) }); }

// components/cards/PointCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function PointCard({
  label,
  title,
  tone = 'slate',
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: tone === 'olive' ? 'var(--surface-card-alt)' : 'var(--surface-card)',
      color: 'var(--text-on-dark)',
      borderRadius: 'var(--radius-card)',
      padding: '40px 34px',
      ...style
    }
  }, rest), label ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-core)',
      fontWeight: 800,
      fontSize: 13,
      letterSpacing: 'var(--eyebrow-tracking-tight)',
      textTransform: 'uppercase',
      color: 'var(--text-on-dark-muted)',
      marginBottom: 14
    }
  }, label) : null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 'var(--display-card-sm)',
      lineHeight: 1.2,
      margin: '0 0 14px'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--body-sm)',
      lineHeight: 'var(--body-leading-card)',
      opacity: 0.84,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, children));
}
Object.assign(__ds_scope, { PointCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/PointCard.jsx", error: String((e && e.message) || e) }); }

// components/cards/StepCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function StepCard({
  ordinal,
  title,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-inset)',
      border: '1px solid rgba(230,232,228,0.12)',
      borderRadius: 'var(--radius-step)',
      padding: '28px 24px',
      color: 'var(--text-on-dark)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-core)',
      fontWeight: 800,
      color: 'var(--text-accent)',
      fontSize: 14,
      marginBottom: 12,
      letterSpacing: '0.06em'
    }
  }, ordinal), /*#__PURE__*/React.createElement("h4", {
    style: {
      fontSize: 16,
      fontWeight: 600,
      margin: '0 0 8px'
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      opacity: 0.75,
      margin: 0,
      lineHeight: 1.6
    }
  }, children));
}
Object.assign(__ds_scope, { StepCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/StepCard.jsx", error: String((e && e.message) || e) }); }

// components/cards/TrackCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function TrackCard({
  tag,
  title,
  tone = 'slate',
  href,
  linkLabel,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: tone === 'olive' ? 'var(--surface-card-alt)' : 'var(--surface-card)',
      color: 'var(--text-on-dark)',
      padding: '56px 48px',
      borderRadius: 'var(--radius-card)',
      position: 'relative',
      zIndex: 1,
      ...style
    }
  }, rest), tag ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-core)',
      fontWeight: 700,
      fontSize: 12,
      letterSpacing: 'var(--eyebrow-tracking-tight)',
      textTransform: 'uppercase',
      color: 'var(--text-on-dark-muted)',
      marginBottom: 16
    }
  }, tag) : null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 'var(--display-card)',
      lineHeight: 1.2,
      margin: '0 0 16px'
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--body-sm)',
      lineHeight: 'var(--body-leading-card)',
      opacity: 0.82,
      margin: '0 0 28px'
    }
  }, children), href ? /*#__PURE__*/React.createElement("a", {
    href: href,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontWeight: 600,
      fontSize: 15,
      color: 'var(--text-on-dark)',
      borderBottom: '1px solid rgba(230,232,228,0.4)',
      paddingBottom: 3
    }
  }, linkLabel) : null);
}
Object.assign(__ds_scope, { TrackCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/TrackCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Eyebrow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Eyebrow({
  tone = 'steel',
  children,
  style,
  ...rest
}) {
  const color = tone === 'grey' ? 'var(--text-on-dark-muted)' : 'var(--text-accent)';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontFamily: 'var(--font-core)',
      fontWeight: 700,
      letterSpacing: 'var(--eyebrow-tracking)',
      textTransform: 'uppercase',
      fontSize: 'var(--eyebrow-size)',
      color,
      marginBottom: 18,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Stroke glyphs lifted verbatim from arrosho.com — 24x24 box, stroke-width 2, no fill.
const arroshoIconPaths = {
  message: /*#__PURE__*/React.createElement("path", {
    d: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
  }),
  mail: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "4",
    width: "20",
    height: "16",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m22 6-10 7L2 6"
  })),
  envelope: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M4 4h16v16H4z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m4 4 8 8 8-8"
  })),
  pin: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "3"
  })),
  users: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "7",
    r: "4"
  })),
  phone: /*#__PURE__*/React.createElement("path", {
    d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
  }),
  search: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  })),
  bars: /*#__PURE__*/React.createElement("path", {
    d: "M12 20V10M18 20V4M6 20v-4"
  }),
  pulse: /*#__PURE__*/React.createElement("path", {
    d: "M22 12h-4l-3 9L9 3l-3 9H2"
  }),
  chart: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 3v18h18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18 17V9M13 17V5M8 17v-3"
  })),
  checkSquare: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M9 11l3 3L22 4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
  })),
  expand: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M16 3h5v5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 3H3v5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 16v5h5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 16v5h-5"
  })),
  arrowRight: /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M13 5l7 7-7 7"
  })
};
function Icon({
  name,
  size = 20,
  color = 'currentColor',
  strokeWidth = 2,
  style,
  ...rest
}) {
  const glyph = arroshoIconPaths[name];
  if (!glyph) return null;
  return /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    "aria-hidden": "true",
    style: {
      width: size,
      height: size,
      flexShrink: 0,
      display: 'block',
      ...style
    }
  }, rest), glyph);
}
Object.assign(__ds_scope, { arroshoIconPaths, Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/cards/FeatureItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function FeatureItem({
  icon,
  title,
  tone = 'light',
  last = false,
  children,
  style,
  ...rest
}) {
  const dark = tone === 'dark';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      gap: 20,
      paddingBottom: last ? 0 : 28,
      borderBottom: last ? 'none' : '1px solid ' + (dark ? 'var(--border-hairline-dark)' : 'var(--border-hairline)'),
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 'var(--radius-icon)',
      background: dark ? 'var(--arr-steel)' : 'var(--arr-slate)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20,
    color: "var(--arr-white)"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 17,
      fontWeight: 600,
      margin: '0 0 6px',
      color: dark ? 'var(--text-on-dark)' : 'var(--text-body)'
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15,
      lineHeight: 1.6,
      margin: 0,
      color: dark ? 'var(--text-on-dark-muted)' : 'var(--text-muted)'
    }
  }, children)));
}
Object.assign(__ds_scope, { FeatureItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/FeatureItem.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const base = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
  fontSize: 16,
  padding: '16px 28px',
  borderRadius: 'var(--radius-action)',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'transform var(--dur-fast) ease, background var(--dur-fast) ease'
};
function Button({
  variant = 'primary',
  icon,
  iconPosition = 'end',
  full = false,
  as,
  href,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const skin = variant === 'ghost' ? {
    background: hover ? 'rgba(230,232,228,0.16)' : 'rgba(230,232,228,0.08)',
    border: '1px solid var(--border-inset)',
    color: 'var(--text-on-dark)',
    fontSize: 16.5,
    padding: '17px 30px'
  } : {
    background: hover ? 'var(--action-bg-hover)' : 'var(--action-bg)',
    color: 'var(--action-fg)'
  };
  const Tag = as || (href ? 'a' : 'button');
  const glyph = icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 19
  }) : null;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    href: href,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      ...base,
      ...skin,
      width: full ? '100%' : undefined,
      justifyContent: full ? 'center' : undefined,
      transform: hover ? 'var(--hover-lift)' : 'none',
      ...style
    }
  }, rest), icon && iconPosition === 'start' ? glyph : null, children, icon && iconPosition === 'end' ? glyph : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Pill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Pill({
  icon,
  href,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", _extends({
    href: href,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 14,
      padding: '20px 30px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--gradient-pill)',
      color: 'var(--text-on-dark)',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 18,
      border: '1px solid var(--border-card)',
      cursor: 'pointer',
      transform: hover ? 'var(--hover-lift)' : 'none',
      boxShadow: hover ? 'var(--shadow-lift)' : 'none',
      transition: 'transform var(--dur-base) ease, box-shadow var(--dur-base) ease',
      ...style
    }
  }, rest), children, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20
  }) : null);
}
Object.assign(__ds_scope, { Pill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Pill.jsx", error: String((e && e.message) || e) }); }

// components/core/StickyBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function StickyBar({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: "arr-sticky-bar",
    style: {
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 50,
      padding: '10px 14px calc(10px + env(safe-area-inset-bottom))',
      background: 'rgba(27,31,10,0.94)',
      backdropFilter: 'blur(8px)',
      borderTop: '1px solid var(--border-hairline-dark)',
      gap: 10,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { StickyBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StickyBar.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tag({
  tone = 'on-dark',
  children,
  style,
  ...rest
}) {
  const dark = tone === 'on-dark';
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-block',
      fontFamily: 'var(--font-core)',
      fontWeight: 700,
      letterSpacing: 'var(--eyebrow-tracking)',
      textTransform: 'uppercase',
      fontSize: 12,
      color: dark ? 'var(--text-on-dark)' : 'var(--arr-olive)',
      opacity: dark ? 0.7 : 1,
      border: '1px solid ' + (dark ? 'var(--border-inset)' : 'var(--border-hairline)'),
      borderRadius: 'var(--radius-round)',
      padding: '8px 16px',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/disclosure/Accordion.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function AccordionItem({
  question,
  first = false,
  children
}) {
  const [open, setOpen] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: '1px solid rgba(27,31,10,0.14)',
      borderTop: first ? '1px solid rgba(27,31,10,0.14)' : 'none',
      padding: '22px 0'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    "aria-expanded": open,
    style: {
      all: 'unset',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 20,
      width: '100%',
      fontFamily: 'var(--font-body)',
      fontSize: 18,
      fontWeight: 600,
      color: 'var(--text-body)',
      lineHeight: 1.4
    }
  }, /*#__PURE__*/React.createElement("span", null, question), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-core)',
      fontWeight: 700,
      fontSize: 24,
      lineHeight: 1,
      color: 'var(--text-accent)',
      flexShrink: 0
    }
  }, open ? '–' : '+')), open ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      fontSize: 16,
      lineHeight: 'var(--body-leading-loose)',
      color: 'var(--text-muted)',
      maxWidth: 680,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, children) : null);
}
function Accordion({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      maxWidth: 820,
      margin: '0 auto',
      ...style
    }
  }, rest), React.Children.map(children, (c, i) => React.isValidElement(c) ? React.cloneElement(c, {
    first: i === 0
  }) : c));
}
Object.assign(__ds_scope, { AccordionItem, Accordion });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/disclosure/Accordion.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const control = {
  width: '100%',
  background: 'var(--surface-field)',
  border: '1px solid var(--surface-inset-strong)',
  borderRadius: 'var(--radius-field)',
  padding: '12px 14px',
  color: 'var(--text-on-dark)',
  fontFamily: 'var(--font-body)',
  fontSize: 15,
  marginBottom: 20
};
function Field({
  label,
  type = 'text',
  id,
  placeholder,
  options,
  rows,
  value,
  onChange,
  style,
  ...rest
}) {
  const common = {
    id,
    name: id,
    placeholder,
    value,
    onChange,
    style: {
      ...control,
      ...(type === 'textarea' ? {
        resize: 'vertical',
        minHeight: 90
      } : null),
      ...style
    },
    ...rest
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    style: {
      display: 'block',
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: '0.04em',
      marginBottom: 8,
      color: 'var(--text-on-dark-muted)'
    }
  }, label), type === 'textarea' ? /*#__PURE__*/React.createElement("textarea", common) : type === 'select' ? /*#__PURE__*/React.createElement("select", common, (options || []).map(o => /*#__PURE__*/React.createElement("option", {
    key: o
  }, o))) : /*#__PURE__*/React.createElement("input", _extends({
    type: type
  }, common)));
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/layout/Section.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SURFACES = {
  page: {
    background: 'var(--surface-page)',
    color: 'var(--text-body)',
    stream: 'var(--arr-steel)'
  },
  mist: {
    background: 'var(--surface-mist)',
    color: 'var(--text-body)',
    stream: 'var(--arr-sage)'
  },
  clay: {
    background: 'var(--surface-clay)',
    color: 'var(--text-body)',
    stream: 'var(--arr-olive)'
  },
  slate: {
    background: 'var(--surface-slate)',
    color: 'var(--text-on-dark)',
    stream: 'var(--arr-steel)'
  },
  olive: {
    background: 'var(--surface-olive)',
    color: 'var(--text-on-dark)',
    stream: 'var(--arr-white)'
  },
  gradient: {
    background: 'var(--gradient-dark)',
    color: 'var(--text-on-dark)',
    stream: 'var(--arr-white)'
  }
};
function Section({
  surface = 'page',
  stream = 'band',
  width = 'wide',
  padY,
  id,
  className,
  children,
  style,
  ...rest
}) {
  const s = SURFACES[surface] || SURFACES.page;
  return /*#__PURE__*/React.createElement("section", _extends({
    id: id,
    className: ['arr-section', className].filter(Boolean).join(' '),
    style: {
      position: 'relative',
      overflow: 'hidden',
      background: s.background,
      color: s.color,
      scrollMarginTop: 24,
      ...(padY ? {
        '--section-y': padY
      } : null),
      ...style
    }
  }, rest), surface === 'gradient' ? /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--noise-overlay)',
      mixBlendMode: 'overlay',
      pointerEvents: 'none'
    }
  }) : null, stream ? /*#__PURE__*/React.createElement(__ds_scope.StreamBackground, {
    preset: stream,
    color: s.stream
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: width === 'narrow' ? 'var(--content-max-narrow)' : 'var(--content-max)',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1
    }
  }, children));
}
Object.assign(__ds_scope, { Section });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Section.jsx", error: String((e && e.message) || e) }); }

// components/layout/SectionHeading.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SectionHeading({
  eyebrow,
  eyebrowTone = 'steel',
  align = 'center',
  size = 'section',
  maxWidth = 680,
  children,
  style,
  ...rest
}) {
  const fs = size === 'sub' ? 'var(--display-sub)' : 'var(--display-section)';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      textAlign: align,
      maxWidth,
      margin: align === 'center' ? '0 auto 56px' : '0 0 40px',
      position: 'relative',
      zIndex: 1,
      ...style
    }
  }, rest), eyebrow ? /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    tone: eyebrowTone
  }, eyebrow) : null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: fs,
      lineHeight: 1.15,
      letterSpacing: 'var(--display-tracking)',
      margin: 0,
      textWrap: 'balance'
    }
  }, children));
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/SectionHeading.jsx", error: String((e && e.message) || e) }); }

// components/legal/BackLink.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function BackLink({
  href = '/',
  children = 'Back to site',
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", _extends({
    href: href,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontWeight: 600,
      fontSize: 14,
      color: 'var(--text-on-dark)',
      opacity: hover ? 1 : 0.85,
      borderBottom: '1px solid ' + (hover ? 'var(--arr-white)' : 'rgba(230,232,228,0.35)'),
      paddingBottom: 3,
      transition: 'opacity var(--dur-fast) ease, border-color var(--dur-fast) ease',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "arrowRight",
    size: 16,
    style: {
      transform: 'scaleX(-1)'
    }
  }), children);
}
Object.assign(__ds_scope, { BackLink });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/legal/BackLink.jsx", error: String((e && e.message) || e) }); }

// components/legal/DisclaimerBox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function DisclaimerBox({
  label = 'Note:',
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-clay)',
      borderLeft: '4px solid var(--arr-steel)',
      borderRadius: 'var(--radius-icon)',
      padding: '20px 24px',
      margin: '32px 0 48px',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14.5,
      lineHeight: 1.6,
      color: 'var(--text-muted)',
      margin: 0
    }
  }, label ? /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text-body)'
    }
  }, label, " ") : null, children));
}
Object.assign(__ds_scope, { DisclaimerBox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/legal/DisclaimerBox.jsx", error: String((e && e.message) || e) }); }

// components/legal/LegalClause.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function LegalClause({
  num,
  title,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      marginBottom: 44,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 22,
      lineHeight: 1.2,
      color: 'var(--text-body)',
      margin: '0 0 16px',
      display: 'flex',
      gap: 14,
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-core)',
      fontWeight: 800,
      fontSize: 15,
      color: 'var(--text-accent)',
      letterSpacing: '0.04em',
      flexShrink: 0,
      paddingTop: 3
    }
  }, num), title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15.5,
      lineHeight: 1.72,
      color: 'var(--text-muted)',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, children));
}
Object.assign(__ds_scope, { LegalClause });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/legal/LegalClause.jsx", error: String((e && e.message) || e) }); }

// components/legal/Placeholder.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Placeholder({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      background: 'rgba(104,148,161,0.16)',
      borderRadius: 4,
      padding: '1px 6px',
      fontWeight: 600,
      color: 'var(--arr-slate)',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Placeholder });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/legal/Placeholder.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Home.jsx
try { (() => {
const {
  Section,
  SectionHeading,
  Eyebrow,
  Button,
  Pill,
  TrackCard,
  StepCard,
  FeatureItem,
  Field,
  Wordmark,
  StreamBackground,
  Icon
} = window.ArroshoDesignSystem_6655bd;
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    className: "arr-hero",
    style: {
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--gradient-dark)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--noise-overlay)',
      mixBlendMode: 'overlay',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement(StreamBackground, {
    preset: "hero",
    color: "var(--arr-white)"
  }), /*#__PURE__*/React.createElement("img", {
    className: "arr-hide-mobile",
    src: "../../assets/stream-root.svg",
    alt: "",
    style: {
      position: 'absolute',
      right: -40,
      top: 110,
      width: 'min(46vw,560px)',
      opacity: 0.16,
      zIndex: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--content-max)',
      width: '100%',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    width: 300,
    style: {
      marginBottom: 56
    }
  }), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 'var(--display-hero)',
      lineHeight: 'var(--display-leading)',
      color: 'var(--arr-white)',
      letterSpacing: 'var(--display-tracking)',
      maxWidth: 920,
      textTransform: 'uppercase',
      margin: 0
    }
  }, "Sourcing opportunities"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 28,
      maxWidth: 640,
      fontSize: 'var(--body-hero)',
      lineHeight: 1.6,
      color: 'var(--arr-white)',
      opacity: 0.82,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "Here at Arrosho we truly source opportunities."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      textWrap: 'balance'
    }
  }, "We understand the root, find the source, and treat leaks so that worries grow into opportunities.")), /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Site sections",
    style: {
      marginTop: 40,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    href: "#consultations",
    icon: "message"
  }, "Consultations"), /*#__PURE__*/React.createElement(Pill, {
    href: "#lead-generation",
    icon: "mail"
  }, "Lead generation"), /*#__PURE__*/React.createElement(Pill, {
    href: "#off-market-sourcing",
    icon: "pin"
  }, "Off-market sourcing"), /*#__PURE__*/React.createElement(Pill, {
    href: "#who-we-are",
    icon: "users"
  }, "Who we are"), /*#__PURE__*/React.createElement(Pill, {
    href: "#contact",
    icon: "phone"
  }, "Contact"))));
}
function Split() {
  return /*#__PURE__*/React.createElement(Section, {
    surface: "mist",
    stream: "wide",
    padY: "120px"
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "One source, two channels"
  }, "We source in two directions \u2014 the same way, for two different rooms."), /*#__PURE__*/React.createElement("div", {
    className: "arr-grid-2",
    style: {
      position: 'relative',
      maxWidth: 1080,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("img", {
    className: "arr-hide-mobile",
    src: "../../assets/stream-divider.svg",
    alt: "",
    style: {
      position: 'absolute',
      left: '50%',
      top: -64,
      transform: 'translateX(-50%)',
      width: 140,
      height: 'calc(100% + 64px)',
      zIndex: 0
    }
  }), /*#__PURE__*/React.createElement(TrackCard, {
    tag: "For recruitment & staffing agencies",
    title: "A pipeline that doesn't rely on referrals",
    href: "#lead-generation",
    linkLabel: "See how lead generation works \u2193"
  }, "Cold email systems built specifically for staffing and recruitment firms \u2014 targeted lists, tested sequences, and inboxes that stay deliverable while you sleep."), /*#__PURE__*/React.createElement(TrackCard, {
    tone: "olive",
    tag: "For builders & developers",
    title: "Development sites before they hit the market",
    href: "#off-market-sourcing",
    linkLabel: "See how sourcing works \u2193"
  }, "We identify, vet, and bring you land and infill opportunities across the U.S. and in your local area, before they're listed \u2014 so you're negotiating instead of competing.")));
}
function Service({
  id,
  surface,
  label,
  title,
  lede,
  features
}) {
  const dark = surface === 'slate';
  return /*#__PURE__*/React.createElement(Section, {
    surface: surface,
    id: id,
    stream: "band"
  }, /*#__PURE__*/React.createElement("div", {
    className: "arr-grid-service"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: dark ? 'steel' : 'steel'
  }, label), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 'clamp(30px,3.4vw,42px)',
      lineHeight: 1.15,
      margin: '0 0 22px',
      letterSpacing: 'var(--display-tracking)'
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      lineHeight: 1.65,
      maxWidth: 420,
      margin: 0,
      color: dark ? 'var(--text-on-dark-muted)' : 'var(--text-muted)'
    }
  }, lede)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 28
    }
  }, features.map((ft, i) => /*#__PURE__*/React.createElement(FeatureItem, {
    key: ft.title,
    icon: ft.icon,
    title: ft.title,
    tone: dark ? 'dark' : 'light',
    last: i === features.length - 1
  }, ft.body)))));
}
function Consultations() {
  return /*#__PURE__*/React.createElement(Section, {
    surface: "slate",
    id: "consultations",
    stream: "band",
    padY: "100px",
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "grey"
  }, "Consultations"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 'var(--display-sub)',
      maxWidth: 680,
      margin: '0 auto 20px',
      lineHeight: 1.2,
      letterSpacing: 'var(--display-tracking)'
    }
  }, "One conversation to find out which room you're in"), /*#__PURE__*/React.createElement("p", {
    style: {
      maxWidth: 560,
      margin: '0 auto 36px',
      fontSize: 16.5,
      lineHeight: 1.65,
      opacity: 0.8
    }
  }, "Every engagement starts the same way \u2014 a straight conversation about what you're trying to grow, and whether lead generation or off-market sourcing is the right fit."), /*#__PURE__*/React.createElement(Button, {
    href: "#contact",
    icon: "arrowRight"
  }, "Book a consultation"), /*#__PURE__*/React.createElement("div", {
    className: "arr-grid-3",
    style: {
      maxWidth: 900,
      margin: '48px auto 0',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement(StepCard, {
    ordinal: "FIRST",
    title: "We listen"
  }, "Tell us what's not working \u2014 thin pipeline, or deals you can't find."), /*#__PURE__*/React.createElement(StepCard, {
    ordinal: "SECOND",
    title: "We scope"
  }, "We map out what a realistic engagement looks like, in plain terms."), /*#__PURE__*/React.createElement(StepCard, {
    ordinal: "THIRD",
    title: "We start"
  }, "No lock-in pitch decks \u2014 just a clear first step and a timeline.")));
}
function WhoWeAre() {
  return /*#__PURE__*/React.createElement(Section, {
    surface: "page",
    id: "who-we-are",
    stream: "band"
  }, /*#__PURE__*/React.createElement("div", {
    className: "arr-grid-2",
    style: {
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "Who we are"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 'clamp(30px,3.6vw,42px)',
      lineHeight: 1.15,
      margin: '0 0 22px',
      letterSpacing: 'var(--display-tracking)'
    }
  }, "One team, multiple ways of finding what's underneath"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16.5,
      lineHeight: 1.7,
      color: 'var(--text-muted)',
      margin: '0 0 16px'
    }
  }, "Arrosho was built on a simple observation: whether you're a staffing agency short on pipeline or a builder short on land, the actual problem is the same \u2014 you need someone doing the finding and solving, not just the asking and theorizing."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16.5,
      lineHeight: 1.7,
      color: 'var(--text-muted)',
      margin: 0
    }
  }, "Arrosho is built around the method, not the industry: trace the stream to its source, and bring back something worth building on.")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-olive)',
      borderRadius: 'var(--radius-card)',
      padding: 48,
      color: 'var(--arr-white)'
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    width: 220,
    style: {
      marginBottom: 24
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-on-dark-muted)',
      fontSize: 15,
      lineHeight: 1.7,
      margin: '0 0 14px'
    }
  }, "\"Arrosho\" takes its name from arroyo \u2014 a brook, a stream. Water that finds its own path below the surface, carving a route to opportunity that isn't sitting on the open market or the open inbox."), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-on-dark-muted)',
      fontSize: 15,
      lineHeight: 1.7,
      margin: 0
    }
  }, "That's the throughline across everything we do, for every client, in every conversation."))));
}
function Contact() {
  const [sent, setSent] = React.useState(false);
  return /*#__PURE__*/React.createElement(Section, {
    surface: "olive",
    id: "contact",
    stream: "band"
  }, /*#__PURE__*/React.createElement("div", {
    className: "arr-grid-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "grey"
  }, "Contact"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 'var(--display-sub)',
      lineHeight: 1.2,
      margin: '0 0 18px',
      letterSpacing: 'var(--display-tracking)'
    }
  }, "Where's the leak and where are you trying to grow?"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      lineHeight: 1.65,
      opacity: 0.82,
      maxWidth: 420,
      margin: '0 0 32px'
    }
  }, "Whether you're a recruitment agency looking for pipeline, or a builder looking for land \u2014 either way, this goes to the same place and we'll route it to the right stream."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, [['envelope', 'ethan@arrosho.com'], ['phone', '(956) 379-7019'], ['pin', 'Serving clients across the U.S.']].map(([ic, label]) => /*#__PURE__*/React.createElement("div", {
    key: label,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      fontSize: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 10,
      background: 'rgba(230,232,228,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 17,
    color: "var(--arr-white)"
  })), /*#__PURE__*/React.createElement("span", null, label))))), /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      setSent(true);
    },
    style: {
      background: 'var(--surface-inset)',
      border: '1px solid rgba(230,232,228,0.14)',
      borderRadius: 18,
      padding: 36
    }
  }, /*#__PURE__*/React.createElement(Field, {
    id: "name",
    label: "Name",
    placeholder: "Your name"
  }), /*#__PURE__*/React.createElement(Field, {
    id: "company",
    label: "Company",
    placeholder: "Your company (optional)"
  }), /*#__PURE__*/React.createElement(Field, {
    id: "which",
    label: "I'm looking for",
    type: "select",
    options: ['Lead generation (recruitment / staffing)', 'Off-market sourcing (builder / developer)', 'Other', 'Not sure yet']
  }), /*#__PURE__*/React.createElement(Field, {
    id: "message",
    label: "Message",
    type: "textarea",
    placeholder: "What's your leak and what are you trying to grow?"
  }), /*#__PURE__*/React.createElement(Button, {
    full: true,
    type: "submit"
  }, sent ? 'Preparing your email…' : 'Send message'))));
}
function SiteFooter() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--arr-black)',
      color: 'var(--text-on-dark-muted)',
      textAlign: 'center',
      padding: '32px 24px',
      fontSize: 13
    }
  }, "\xA9 ", new Date().getFullYear(), " Arrosho. All rights reserved.", /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: 'flex',
      gap: 18,
      justifyContent: 'center',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#top",
    style: {
      borderBottom: '1px solid rgba(161,176,171,0.3)'
    }
  }, "Home"), /*#__PURE__*/React.createElement("a", {
    href: "#terms",
    style: {
      borderBottom: '1px solid rgba(161,176,171,0.3)'
    }
  }, "Terms & Conditions")));
}
function Home() {
  return /*#__PURE__*/React.createElement("div", {
    id: "top"
  }, /*#__PURE__*/React.createElement(Hero, null), /*#__PURE__*/React.createElement(Split, null), /*#__PURE__*/React.createElement(Service, {
    id: "lead-generation",
    surface: "slate",
    label: "Lead generation",
    title: "Pipeline for recruitment and staffing agencies",
    lede: "We run the outreach engine \u2014 list building, copy, sending infrastructure, and reply handling \u2014 so your desk stays full of qualified conversations, not cold silence.",
    features: [{
      icon: 'search',
      title: 'Targeted list building',
      body: "Lists built around the roles and industries your agency actually places — not generic B2B scraping."
    }, {
      icon: 'envelope',
      title: 'Sequences that get replies',
      body: 'Messaging written for how staffing buyers actually make decisions, tested and refined against real reply data.'
    }, {
      icon: 'bars',
      title: 'Deliverability that holds up',
      body: "Inbox warmup, sending infrastructure, and volume paced to protect your domain's reputation long-term."
    }, {
      icon: 'pulse',
      title: 'Conversations, handed to you',
      body: 'You get warm replies and booked calls — we handle everything upstream of that first conversation.'
    }]
  }), /*#__PURE__*/React.createElement(Service, {
    id: "off-market-sourcing",
    surface: "clay",
    label: "Off-market sourcing",
    title: "Development sites across the U.S., before they're listed",
    lede: "We do the legwork of finding, vetting, and approaching landowners \u2014 bringing builders and developers deals that never touch the open market.",
    features: [{
      icon: 'pin',
      title: 'Site identification',
      body: 'We map ownership, zoning, and parcel data across target markets to surface land that fits your build profile.'
    }, {
      icon: 'checkSquare',
      title: 'Owner outreach & vetting',
      body: "Direct contact with landowners, motivation and title checks, and early diligence before you're ever pitched a deal."
    }, {
      icon: 'chart',
      title: 'Underwriting support',
      body: 'Comparable data and site context packaged so you can evaluate a deal quickly — not chase down basics yourself.'
    }, {
      icon: 'expand',
      title: 'First look, not a bidding war',
      body: "Because these sites aren't publicly listed, you're negotiating directly instead of competing against other bidders."
    }]
  }), /*#__PURE__*/React.createElement(Consultations, null), /*#__PURE__*/React.createElement(WhoWeAre, null), /*#__PURE__*/React.createElement(Contact, null), /*#__PURE__*/React.createElement(SiteFooter, null));
}
Object.assign(window, {
  Home,
  SiteFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Home.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/HomeownerBreakdown.jsx
try { (() => {
const {
  Section,
  SectionHeading,
  Eyebrow,
  Button,
  Tag,
  PointCard,
  Accordion,
  AccordionItem,
  Wordmark,
  StreamBackground,
  StickyBar,
  Icon
} = window.ArroshoDesignSystem_6655bd;
function BreakdownHero() {
  return /*#__PURE__*/React.createElement("section", {
    className: "arr-hero-centered",
    style: {
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--gradient-dark)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--noise-overlay)',
      mixBlendMode: 'overlay',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement(StreamBackground, {
    preset: "hero",
    color: "var(--arr-white)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--content-max-narrow)',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    width: 230,
    style: {
      margin: '0 auto 44px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(Tag, null, "For homeowners")), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 'var(--display-page)',
      lineHeight: 1,
      color: 'var(--arr-white)',
      letterSpacing: 'var(--display-tracking)',
      maxWidth: 900,
      margin: '0 auto',
      textTransform: 'uppercase',
      textWrap: 'balance'
    }
  }, "Seven percent of your home's value should stay in your pocket."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '22px auto 0',
      maxWidth: 620,
      fontSize: 18,
      lineHeight: 1.6,
      color: 'var(--arr-white)',
      opacity: 0.85,
      textWrap: 'balance'
    }
  }, "Agents usually take a commission, and you pay closing costs. I take no commission from you. No closing costs on your side. No sign in the yard. Here's the whole breakdown in a few minutes \u2014 then decide if it's for you."), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 900,
      margin: '44px auto 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      paddingTop: '56.25%',
      borderRadius: 'var(--radius-video)',
      overflow: 'hidden',
      background: '#12181A',
      border: '1px solid rgba(230,232,228,0.18)',
      boxShadow: 'var(--shadow-media)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--arr-grey)',
      fontSize: 14,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontFamily: 'var(--font-core)',
      fontWeight: 700
    }
  }, "Video \u2014 the homeowner breakdown")), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 16,
      fontSize: 14,
      color: 'var(--arr-white)',
      opacity: 0.65
    }
  }, "Best with sound on. Watch the whole thing \u2014 the last part is the part that matters.")), /*#__PURE__*/React.createElement("div", {
    className: "arr-cta-row",
    style: {
      justifyContent: 'center',
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement(Button, {
    icon: "message",
    href: "sms:+19563797019"
  }, "Text me: (956) 379-7019"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: "phone",
    href: "tel:+19563797019"
  }, "Or call"))));
}
function HomeownerBreakdown() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(BreakdownHero, null), /*#__PURE__*/React.createElement(Section, {
    surface: "mist",
    stream: "wide",
    padY: "104px",
    width: "narrow"
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "The short version"
  }, "Three things you don't deal with"), /*#__PURE__*/React.createElement("div", {
    className: "arr-grid-3"
  }, /*#__PURE__*/React.createElement(PointCard, {
    label: "One \u2014 the fees",
    title: "Zero on your side"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "No commission. No closing costs on your end. I get paid by the buyer at closing."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "On the market, between the agents and the seller's side of closing, you're giving up 7\u20138%. On a million-dollar house that's $70,000\u2013$80,000. That's not a discount I'm offering \u2014 it's money that never leaves your pocket.")), /*#__PURE__*/React.createElement(PointCard, {
    tone: "olive",
    label: "Two \u2014 the listing",
    title: "Nobody has to know"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "No open houses. No photographer in your bedroom. No sign in the yard telling the whole street your business."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "Sometimes it's one guy, one visit, twenty minutes \u2014 and he doesn't even have to go inside.")), /*#__PURE__*/React.createElement(PointCard, {
    label: "Three \u2014 the deadline",
    title: "You pick the timeline"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "Close in thirty days if you've already got the next place. Or next spring, after your kids graduate."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "Need to stay in the house a few months after closing while you figure out where you're going? That's normal here.")))), /*#__PURE__*/React.createElement(Section, {
    surface: "slate",
    stream: "band",
    padY: "100px",
    width: "narrow"
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "grey"
  }, "If that sounds too good \u2014 fair"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 'var(--display-sub)',
      lineHeight: 1.18,
      margin: '0 0 22px',
      maxWidth: 620,
      letterSpacing: 'var(--display-tracking)'
    }
  }, "Here's the actual mechanics"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      lineHeight: 1.7,
      opacity: 0.82,
      maxWidth: 640,
      margin: '0 0 16px'
    }
  }, "It's me and a short list of builders I talk to. They tell me what they're hunting, I go find it, and they pay me at closing. That's it."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      lineHeight: 1.7,
      opacity: 0.82,
      maxWidth: 640,
      margin: 0
    }
  }, "I'd be out of business fast if I brought them bad deals \u2014 so I'm not going to waste your time with a lowball either."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 32,
      borderLeft: '3px solid var(--arr-steel)',
      padding: '6px 0 6px 22px',
      maxWidth: 640
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      opacity: 0.72,
      margin: 0,
      lineHeight: 1.7
    }
  }, "And if squeezing out the absolute highest number matters more to you than any of this \u2014 put it on the market and go get every dollar you can. Genuinely. This isn't for everybody."))), /*#__PURE__*/React.createElement(Section, {
    surface: "clay",
    stream: "band",
    padY: "104px",
    width: "narrow"
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "Straight answers"
  }, "The questions everybody asks first"), /*#__PURE__*/React.createElement(Accordion, null, /*#__PURE__*/React.createElement(AccordionItem, {
    question: "What does this cost me?"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "Nothing. No commission, and no closing costs on your side. I'm paid by the buyer at closing, not by you.")), /*#__PURE__*/React.createElement(AccordionItem, {
    question: "Can you just tell me a number from my address?"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "No \u2014 and be careful with anyone who does. What a builder pays depends on how much of the lot they can actually build on, and I can't see that from the street."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "Ten minutes on the phone and I can tell you something real.")), /*#__PURE__*/React.createElement(AccordionItem, {
    question: "Am I committing to anything by texting you?"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "No. You're not signing anything. If it's not for you, tell me no and we're done. Your house, your call.")), /*#__PURE__*/React.createElement(AccordionItem, {
    question: "Will my neighbors find out I'm selling?"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "Not from me. There's no listing, no sign, no open house, and no photos online.")), /*#__PURE__*/React.createElement(AccordionItem, {
    question: "What do I send in the first text?"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "Just your name and your address. That's enough to start. We'll set up ten minutes on the phone from there.")))), /*#__PURE__*/React.createElement(Section, {
    surface: "olive",
    stream: "band",
    padY: "104px",
    width: "narrow",
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "grey"
  }, "Contact"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 'var(--display-sub)',
      lineHeight: 1.18,
      margin: '0 auto 18px',
      maxWidth: 680,
      letterSpacing: 'var(--display-tracking)',
      textWrap: 'balance'
    }
  }, "Send me your name and your address. That's the whole first step."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16.5,
      lineHeight: 1.7,
      opacity: 0.84,
      maxWidth: 520,
      margin: '0 auto 34px'
    }
  }, "You're not signing anything. If it's not for you, tell me no and we're done."), /*#__PURE__*/React.createElement("a", {
    href: "tel:+19563797019",
    style: {
      display: 'inline-block',
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(30px,5vw,46px)',
      letterSpacing: '-0.01em',
      color: 'var(--arr-white)',
      margin: '8px 0 6px'
    }
  }, "(956)\xA0379-7019"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      fontFamily: 'var(--font-core)',
      fontWeight: 700,
      color: 'var(--text-on-dark-muted)',
      marginBottom: 32
    }
  }, "Ethan \xB7 Arrosho"), /*#__PURE__*/React.createElement("div", {
    className: "arr-cta-row",
    style: {
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    icon: "message",
    href: "sms:+19563797019"
  }, "Text me"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: "phone",
    href: "tel:+19563797019"
  }, "Call instead")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 36,
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px 28px',
      justifyContent: 'center',
      fontSize: 15,
      opacity: 0.78
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "envelope",
    size: 16,
    color: "var(--arr-white)"
  }), "ethan@arrosho.com"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: 16,
    color: "var(--arr-white)"
  }), "Serving homeowners across the U.S."))), /*#__PURE__*/React.createElement(SiteFooter, null), /*#__PURE__*/React.createElement(StickyBar, null, /*#__PURE__*/React.createElement(Button, {
    full: true,
    href: "sms:+19563797019"
  }, "Text Ethan"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    full: true,
    href: "tel:+19563797019"
  }, "Call")));
}
Object.assign(window, {
  HomeownerBreakdown
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/HomeownerBreakdown.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Terms.jsx
try { (() => {
const {
  Section,
  Eyebrow,
  Wordmark,
  StreamBackground,
  Icon,
  LegalClause,
  DisclaimerBox,
  Placeholder,
  BackLink
} = window.ArroshoDesignSystem_6655bd;
const CLAUSES = [['01', 'Who We Are & What We Do', ['Arrosho provides lead generation services for recruitment and staffing agencies, and off-market property sourcing services for builders and developers. The specific scope of any engagement is set out in a separate written agreement (an "Engagement Agreement").']], ['02', 'Use of the Site', ['You may use the Site for lawful purposes only. You agree not to interfere with the Site, attempt to gain unauthorized access to it, or use it to transmit unlawful or harmful material.']], ['03', 'No Guarantee of Results', ['Outreach response rates, deal flow, and closing outcomes depend on market conditions, your own follow-through, and factors outside our control. Nothing on the Site or in our communications is a guarantee of a specific result.']], ['04', 'Client Responsibilities', ['You are responsible for the accuracy of the information you provide, for responding to qualified leads in a timely way, and for your own compliance obligations in the jurisdictions where you operate.']], ['05', 'Outreach, Communications & Compliance', ['Where we send outreach on your behalf, we do so under your brand and with your approval of messaging. You remain responsible for ensuring that outreach complies with applicable law in your markets.']], ['06', 'Fees & Payment', ['Fees, payment schedules, and any performance-based terms are set out in your Engagement Agreement.']], ['07', 'Intellectual Property', ['The Site, its content, and the Arrosho name and marks are owned by Arrosho. Materials produced for you under an Engagement Agreement are governed by that agreement.']], ['08', 'Confidentiality', ['Each party will keep the other\u2019s non-public information confidential and use it only for the purposes of the engagement.']], ['09', 'Third-Party Links & Services', ['The Site may link to third-party sites or rely on third-party tools. We are not responsible for their content, availability, or practices.']], ['10', 'Disclaimers', ['The Site and our services are provided "as is" and "as available," without warranties of any kind except those that cannot be excluded by law.']], ['11', 'Limitation of Liability', ['To the fullest extent permitted by law, Arrosho is not liable for indirect, incidental, or consequential damages arising out of an engagement.']], ['12', 'Indemnification', ['You agree to indemnify Arrosho against claims arising from your use of the Site, your outreach content, or your breach of these Terms.']], ['14', 'Changes to These Terms', ['We may update these Terms from time to time. The "last updated" date above reflects the current version, and continued use of the Site constitutes acceptance.']]];
function Terms() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("section", {
    className: "arr-hero-centered",
    style: {
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--gradient-dark)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--noise-overlay)',
      mixBlendMode: 'overlay',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement(StreamBackground, {
    preset: "band",
    color: "var(--arr-white)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 920,
      margin: '0 auto',
      position: 'relative',
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 64,
      gap: 24,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    width: 190
  }), /*#__PURE__*/React.createElement(BackLink, {
    href: "#top"
  }, "Back to arrosho.com")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-core)',
      fontWeight: 700,
      letterSpacing: 'var(--eyebrow-tracking)',
      textTransform: 'uppercase',
      fontSize: 13,
      color: 'var(--arr-white)',
      opacity: 0.75,
      marginBottom: 16
    }
  }, "Legal"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 'clamp(34px,5.5vw,60px)',
      lineHeight: 1,
      color: 'var(--arr-white)',
      letterSpacing: '-0.02em',
      textTransform: 'uppercase',
      margin: 0
    }
  }, "Terms & Conditions"), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 20,
      fontSize: 15,
      color: 'var(--arr-white)',
      opacity: 0.78
    }
  }, "Last updated: ", /*#__PURE__*/React.createElement(Placeholder, {
    style: {
      color: 'var(--arr-white)',
      background: 'rgba(230,232,228,0.16)'
    }
  }, "July 25, 2026")))), /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-page)',
      padding: '72px var(--gutter) 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 820,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      lineHeight: 1.7,
      color: 'var(--text-muted)',
      margin: '0 0 16px'
    }
  }, "These Terms and Conditions (\"Terms\") govern your access to and use of the website at arrosho.com (the \"Site\") and any services provided by Arrosho (\"Arrosho,\" \"we,\" \"us,\" or \"our\"). By using the Site or engaging our services, you agree to these Terms. If you do not agree, please do not use the Site or our services."), /*#__PURE__*/React.createElement(DisclaimerBox, null, "This document is a general template and not legal advice. Before publishing, have it reviewed by a licensed attorney and replace every ", /*#__PURE__*/React.createElement(Placeholder, null, "highlighted"), " placeholder with your own details."), CLAUSES.map(([num, title, paras]) => /*#__PURE__*/React.createElement(LegalClause, {
    key: num,
    num: num,
    title: title
  }, paras.map((t, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    style: {
      margin: 0
    }
  }, t)))), /*#__PURE__*/React.createElement(LegalClause, {
    num: "13",
    title: "Governing Law & Disputes"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "These Terms are governed by the laws of the State of ", /*#__PURE__*/React.createElement(Placeholder, null, "Texas"), ", without regard to its conflict-of-laws rules. Any dispute will be brought exclusively in the state or federal courts located in ", /*#__PURE__*/React.createElement(Placeholder, null, "[COUNTY], Texas"), ".")), /*#__PURE__*/React.createElement(LegalClause, {
    num: "15",
    title: "Contact"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "Questions about these Terms can be sent to ", /*#__PURE__*/React.createElement("a", {
    href: "mailto:ethan@arrosho.com",
    style: {
      color: 'var(--arr-steel)',
      fontWeight: 600,
      borderBottom: '1px solid rgba(104,148,161,0.4)'
    }
  }, "ethan@arrosho.com"), ".")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border-hairline)',
      margin: '0 0 44px'
    }
  }))), /*#__PURE__*/React.createElement(Section, {
    surface: "olive",
    stream: "band",
    padY: "72px",
    width: "narrow"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 820,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "grey"
  }, "Contact"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 'clamp(26px,3.4vw,36px)',
      lineHeight: 1.2,
      margin: '0 0 16px',
      letterSpacing: 'var(--display-tracking)'
    }
  }, "Still have questions?"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      lineHeight: 1.65,
      opacity: 0.82,
      maxWidth: 520,
      margin: '0 0 28px'
    }
  }, "Reach out and we'll answer plainly \u2014 no legal runaround."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, [['envelope', 'ethan@arrosho.com'], ['phone', '(956) 379-7019']].map(([ic, label]) => /*#__PURE__*/React.createElement("div", {
    key: label,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      fontSize: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 10,
      background: 'rgba(230,232,228,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 17,
    color: "var(--arr-white)"
  })), /*#__PURE__*/React.createElement("span", null, label)))))), /*#__PURE__*/React.createElement(SiteFooter, null));
}
Object.assign(window, {
  Terms
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Terms.jsx", error: String((e && e.message) || e) }); }

__ds_ns.LogoMark = __ds_scope.LogoMark;

__ds_ns.StreamBackground = __ds_scope.StreamBackground;

__ds_ns.Wordmark = __ds_scope.Wordmark;

__ds_ns.FeatureItem = __ds_scope.FeatureItem;

__ds_ns.PointCard = __ds_scope.PointCard;

__ds_ns.StepCard = __ds_scope.StepCard;

__ds_ns.TrackCard = __ds_scope.TrackCard;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Pill = __ds_scope.Pill;

__ds_ns.StickyBar = __ds_scope.StickyBar;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.AccordionItem = __ds_scope.AccordionItem;

__ds_ns.Accordion = __ds_scope.Accordion;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Section = __ds_scope.Section;

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

__ds_ns.BackLink = __ds_scope.BackLink;

__ds_ns.DisclaimerBox = __ds_scope.DisclaimerBox;

__ds_ns.LegalClause = __ds_scope.LegalClause;

__ds_ns.Placeholder = __ds_scope.Placeholder;

})();
