/* @ds-bundle: {"format":4,"namespace":"DevotteDesignSystem_75ebe4","components":[{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"SectionLabel","sourcePath":"components/display/SectionLabel.jsx"},{"name":"Tag","sourcePath":"components/display/Tag.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"Dialog","sourcePath":"components/overlays/Dialog.jsx"},{"name":"Toast","sourcePath":"components/overlays/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/overlays/Tooltip.jsx"}],"sourceHashes":{"components/display/Badge.jsx":"a0be716a8e46","components/display/Card.jsx":"f03844f1fb9c","components/display/SectionLabel.jsx":"6a4d427935e3","components/display/Tag.jsx":"74c5f1d33f09","components/forms/Button.jsx":"63c4a4d7e8fd","components/forms/Checkbox.jsx":"32f49de8b7d0","components/forms/IconButton.jsx":"c973c21b292f","components/forms/Input.jsx":"61824aa5fea8","components/forms/Radio.jsx":"b7d1bdff0393","components/forms/Select.jsx":"8f2071832865","components/forms/Switch.jsx":"2d64670ca596","components/navigation/Tabs.jsx":"c90e9c075752","components/overlays/Dialog.jsx":"11f3fc8b5f29","components/overlays/Toast.jsx":"f1077319bbc4","components/overlays/Tooltip.jsx":"77e8c4cf904a","ui_kits/quotes/QuoteDetail.jsx":"90ad0e1e89dc","ui_kits/quotes/QuoteList.jsx":"cfa109dfbeeb","ui_kits/quotes/Shell.jsx":"5079e35a3197","ui_kits/quotes/data.js":"17767ac85aa8","ui_kits/website/Closing.jsx":"317b787e982b","ui_kits/website/Footer.jsx":"9d6602bc274b","ui_kits/website/Header.jsx":"93fe4e4ac776","ui_kits/website/Hero.jsx":"e2111b0692a3","ui_kits/website/Process.jsx":"859d674b3f67","ui_kits/website/Services.jsx":"f95c8f470c98"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DevotteDesignSystem_75ebe4 = window.DevotteDesignSystem_75ebe4 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Small pill badge. tone: 'neutral' | 'accent' | 'navy' | 'ok' | 'warn' | 'error'. */
function Badge({
  tone = 'neutral',
  children,
  style,
  ...rest
}) {
  const tones = {
    neutral: {
      background: 'var(--navy-08)',
      color: 'var(--navy)'
    },
    accent: {
      background: 'var(--teal-12)',
      color: 'var(--teal-deep)'
    },
    navy: {
      background: 'var(--navy)',
      color: 'var(--cream)'
    },
    ok: {
      background: 'var(--teal-12)',
      color: 'var(--teal-deep)'
    },
    warn: {
      background: 'rgba(154,107,21,0.12)',
      color: 'var(--status-warn)'
    },
    error: {
      background: 'rgba(164,50,38,0.10)',
      color: 'var(--status-error)'
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '3px 10px',
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-body)',
      fontSize: '12px',
      fontWeight: 500,
      ...tones[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Surface card. variant: 'white' | 'mist' (neblina gradient) | 'navy' (dark panel). */
function Card({
  variant = 'white',
  padding = 'var(--space-5)',
  radius = 'var(--radius-lg)',
  shadow = true,
  children,
  style,
  ...rest
}) {
  const variants = {
    white: {
      background: 'var(--white)',
      color: 'var(--navy)',
      border: '1px solid var(--border-subtle)'
    },
    mist: {
      background: 'var(--gradient-mist)',
      color: 'var(--navy)',
      border: '1px solid var(--border-subtle)'
    },
    navy: {
      background: 'var(--navy)',
      color: 'var(--cream)',
      border: '1px solid transparent'
    }
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: radius,
      padding,
      fontFamily: 'var(--font-body)',
      boxShadow: shadow ? 'var(--shadow-card)' : 'none',
      ...variants[variant],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/display/SectionLabel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Brand motif: mono lowercase label wrapped in angle brackets — <01 · la marca>. */
function SectionLabel({
  children,
  color = 'var(--teal-deep)',
  size = '12px',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 500,
      fontSize: size,
      letterSpacing: 'var(--tracking-label)',
      color,
      textTransform: 'lowercase',
      ...style
    }
  }, rest), "<", children, ">");
}
Object.assign(__ds_scope, { SectionLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/SectionLabel.jsx", error: String((e && e.message) || e) }); }

// components/display/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Removable chip. */
function Tag({
  children,
  onRemove,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '5px 12px',
      borderRadius: 'var(--radius-pill)',
      border: '1px solid var(--navy-16)',
      background: 'var(--white)',
      fontFamily: 'var(--font-body)',
      fontSize: '13px',
      color: 'var(--navy)',
      ...style
    }
  }, rest), children, onRemove && /*#__PURE__*/React.createElement("button", {
    onClick: onRemove,
    "aria-label": "Quitar",
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      border: 'none',
      background: hover ? 'var(--navy-08)' : 'transparent',
      borderRadius: '50%',
      width: 16,
      height: 16,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      padding: 0,
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "11",
    height: "11",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Tag.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const sizes = {
  sm: {
    height: 'var(--control-height-sm)',
    padding: '0 16px',
    fontSize: '13px'
  },
  md: {
    height: 'var(--control-height)',
    padding: '0 22px',
    fontSize: '14px'
  },
  lg: {
    height: 'var(--control-height-lg)',
    padding: '0 28px',
    fontSize: '15px'
  }
};

/** Pill button. variant: 'primary' (navy) | 'accent' (señal gradient — highlighted CTAs only) | 'secondary' (outline) | 'ghost'. */
function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: press ? '#0A1117' : hover ? '#0D161C' : 'var(--navy)',
      color: 'var(--cream)',
      border: '1px solid transparent'
    },
    accent: {
      background: 'var(--gradient-signal)',
      color: '#FFFFFF',
      border: '1px solid transparent',
      filter: press ? 'brightness(0.88)' : hover ? 'brightness(0.94)' : 'none'
    },
    secondary: {
      background: press ? 'var(--navy-16)' : hover ? 'var(--navy-08)' : 'transparent',
      color: 'var(--navy)',
      border: '1px solid var(--navy-16)'
    },
    ghost: {
      background: press ? 'var(--navy-16)' : hover ? 'var(--navy-08)' : 'transparent',
      color: 'var(--navy)',
      border: '1px solid transparent'
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      borderRadius: 'var(--radius-pill)',
      cursor: disabled ? 'default' : 'pointer',
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      whiteSpace: 'nowrap',
      transition: 'background var(--duration-fast) var(--ease-out), filter var(--duration-fast) var(--ease-out)',
      opacity: disabled ? 0.45 : 1,
      pointerEvents: disabled ? 'none' : undefined,
      ...s,
      ...variants[variant],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
/** Custom checkbox, deep-teal when checked. Controlled or uncontrolled. */
function Checkbox({
  label,
  checked,
  defaultChecked = false,
  onChange,
  disabled = false,
  style
}) {
  const [internal, setInternal] = React.useState(defaultChecked);
  const isOn = checked !== undefined ? checked : internal;
  const toggle = () => {
    if (disabled) return;
    if (checked === undefined) setInternal(!isOn);
    onChange && onChange(!isOn);
  };
  return /*#__PURE__*/React.createElement("label", {
    onClick: toggle,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      fontFamily: 'var(--font-body)',
      fontSize: '14px',
      color: 'var(--navy)',
      userSelect: 'none',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: '6px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      background: isOn ? 'var(--teal-deep)' : 'var(--white)',
      border: '1px solid ' + (isOn ? 'var(--teal-deep)' : 'var(--navy-16)'),
      transition: 'background var(--duration-fast) var(--ease-out)'
    }
  }, isOn && /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "13",
    height: "13",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }))), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Round quiet button for a single icon. Pass an SVG (e.g. Lucide) as children. */
function IconButton({
  size = 'md',
  label,
  disabled = false,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const px = size === 'sm' ? 32 : size === 'lg' ? 48 : 40;
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": label,
    title: label,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: px,
      height: px,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-pill)',
      border: '1px solid transparent',
      background: hover ? 'var(--navy-08)' : 'transparent',
      color: 'var(--navy)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'background var(--duration-fast) var(--ease-out)',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Text input with optional label and hint. 12px radius, white surface, deep-teal focus ring. */
function Input({
  label,
  hint,
  error,
  style,
  inputStyle,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const id = React.useId();
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    style: {
      display: 'block',
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: '13px',
      fontWeight: 500,
      color: 'var(--navy)',
      marginBottom: '6px'
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: id,
    onFocus: e => {
      setFocus(true);
      rest.onFocus && rest.onFocus(e);
    },
    onBlur: e => {
      setFocus(false);
      rest.onBlur && rest.onBlur(e);
    },
    style: {
      width: '100%',
      boxSizing: 'border-box',
      height: 'var(--control-height)',
      padding: '0 14px',
      borderRadius: 'var(--radius-md)',
      fontSize: '14px',
      fontFamily: 'var(--font-body)',
      background: 'var(--white)',
      color: 'var(--navy)',
      outline: 'none',
      border: '1px solid ' + (error ? 'var(--status-error)' : focus ? 'var(--focus-ring)' : 'var(--navy-16)'),
      boxShadow: focus ? '0 0 0 3px var(--teal-12)' : 'none',
      transition: 'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
      ...inputStyle
    }
  }, rest)), (error || hint) && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: '12px',
      marginTop: '5px',
      color: error ? 'var(--status-error)' : 'var(--text-muted)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
/** Radio group. options: [{value, label}] or strings. Controlled via value/onChange. */
function Radio({
  options = [],
  value,
  defaultValue,
  onChange,
  name,
  direction = 'column',
  style
}) {
  const [internal, setInternal] = React.useState(defaultValue);
  const current = value !== undefined ? value : internal;
  const pick = v => {
    if (value === undefined) setInternal(v);
    onChange && onChange(v);
  };
  return /*#__PURE__*/React.createElement("div", {
    role: "radiogroup",
    style: {
      display: 'flex',
      flexDirection: direction,
      gap: direction === 'column' ? '10px' : '20px',
      ...style
    }
  }, options.map(o => {
    const v = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    const on = current === v.value;
    return /*#__PURE__*/React.createElement("label", {
      key: v.value,
      onClick: () => pick(v.value),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: '14px',
        color: 'var(--navy)',
        userSelect: 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 20,
        height: 20,
        borderRadius: '50%',
        flexShrink: 0,
        boxSizing: 'border-box',
        border: on ? '6px solid var(--teal-deep)' : '1px solid var(--navy-16)',
        background: 'var(--white)',
        transition: 'border var(--duration-fast) var(--ease-out)'
      }
    }), v.label);
  }));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Styled native select. options: [{value, label}] or plain strings. */
function Select({
  label,
  options = [],
  style,
  selectStyle,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const id = React.useId();
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    style: {
      display: 'block',
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: '13px',
      fontWeight: 500,
      color: 'var(--navy)',
      marginBottom: '6px'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: id,
    onFocus: e => {
      setFocus(true);
      rest.onFocus && rest.onFocus(e);
    },
    onBlur: e => {
      setFocus(false);
      rest.onBlur && rest.onBlur(e);
    },
    style: {
      width: '100%',
      boxSizing: 'border-box',
      height: 'var(--control-height)',
      padding: '0 36px 0 14px',
      borderRadius: 'var(--radius-md)',
      fontSize: '14px',
      fontFamily: 'var(--font-body)',
      appearance: 'none',
      background: 'var(--white)',
      color: 'var(--navy)',
      outline: 'none',
      cursor: 'pointer',
      border: '1px solid ' + (focus ? 'var(--focus-ring)' : 'var(--navy-16)'),
      boxShadow: focus ? '0 0 0 3px var(--teal-12)' : 'none',
      transition: 'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
      ...selectStyle
    }
  }, rest), options.map(o => {
    const v = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v.value,
      value: v.value
    }, v.label);
  })), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    style: {
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none'
    },
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  }))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
/** Pill switch, deep teal when on. */
function Switch({
  label,
  checked,
  defaultChecked = false,
  onChange,
  disabled = false,
  style
}) {
  const [internal, setInternal] = React.useState(defaultChecked);
  const isOn = checked !== undefined ? checked : internal;
  const toggle = () => {
    if (disabled) return;
    if (checked === undefined) setInternal(!isOn);
    onChange && onChange(!isOn);
  };
  return /*#__PURE__*/React.createElement("label", {
    onClick: toggle,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      fontFamily: 'var(--font-body)',
      fontSize: '14px',
      color: 'var(--navy)',
      userSelect: 'none',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 24,
      borderRadius: 'var(--radius-pill)',
      position: 'relative',
      flexShrink: 0,
      background: isOn ? 'var(--teal-deep)' : 'var(--navy-16)',
      transition: 'background var(--duration-base) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: isOn ? 19 : 3,
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 1px 2px rgba(22,35,43,0.2)',
      transition: 'left var(--duration-base) var(--ease-out)'
    }
  })), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/** Underline tabs. items: [{id, label}] or strings. Controlled via active/onChange. */
function Tabs({
  items = [],
  active,
  defaultActive,
  onChange,
  style
}) {
  const norm = items.map(i => typeof i === 'string' ? {
    id: i,
    label: i
  } : i);
  const [internal, setInternal] = React.useState(defaultActive !== undefined ? defaultActive : norm[0] && norm[0].id);
  const current = active !== undefined ? active : internal;
  const pick = id => {
    if (active === undefined) setInternal(id);
    onChange && onChange(id);
  };
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: 'flex',
      gap: '4px',
      borderBottom: '1px solid var(--border-default)',
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, norm.map(t => {
    const on = current === t.id;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      role: "tab",
      "aria-selected": on,
      onClick: () => pick(t.id),
      style: {
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: '10px 14px',
        fontFamily: 'inherit',
        fontSize: '14px',
        fontWeight: on ? 600 : 400,
        color: on ? 'var(--navy)' : 'var(--text-muted)',
        boxShadow: on ? 'inset 0 -2px 0 var(--teal-deep)' : 'none',
        transition: 'color var(--duration-fast) var(--ease-out)'
      }
    }, t.label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Dialog.jsx
try { (() => {
/** Modal dialog. Render conditionally via open. */
function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      background: 'var(--navy-60)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    role: "dialog",
    "aria-modal": "true",
    style: {
      width: '100%',
      maxWidth: width,
      background: 'var(--white)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-modal)',
      fontFamily: 'var(--font-body)',
      color: 'var(--navy)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      padding: '20px 24px 0'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: '22px',
      letterSpacing: '-0.01em'
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Cerrar",
    style: {
      marginLeft: 'auto',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      width: 32,
      height: 32,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "18",
    height: "18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 24px 24px',
      fontSize: '14px',
      lineHeight: 1.55
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 24px 24px',
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end'
    }
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Toast.jsx
try { (() => {
/** Inline toast bar (position it yourself, e.g. fixed bottom). tone: 'default' | 'ok' | 'error'. */
function Toast({
  tone = 'default',
  children,
  onClose,
  style
}) {
  const dots = {
    default: 'var(--teal)',
    ok: 'var(--teal)',
    error: '#E07B6E'
  };
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 18px',
      background: 'var(--navy)',
      color: 'var(--cream)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-raised)',
      fontFamily: 'var(--font-body)',
      fontSize: '14px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: dots[tone],
      flexShrink: 0
    }
  }), children, onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Cerrar",
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--cream-60)',
      padding: 0,
      marginLeft: '6px',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Toast.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Tooltip.jsx
try { (() => {
/** Hover tooltip. Wraps its child. */
function Tooltip({
  content,
  side = 'top',
  children
}) {
  const [show, setShow] = React.useState(false);
  const pos = side === 'bottom' ? {
    top: 'calc(100% + 8px)',
    left: '50%',
    transform: 'translateX(-50%)'
  } : {
    bottom: 'calc(100% + 8px)',
    left: '50%',
    transform: 'translateX(-50%)'
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false)
  }, children, show && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: 'absolute',
      ...pos,
      whiteSpace: 'nowrap',
      zIndex: 50,
      background: 'var(--navy)',
      color: 'var(--cream)',
      padding: '6px 10px',
      borderRadius: '8px',
      fontFamily: 'var(--font-body)',
      fontSize: '12px',
      boxShadow: 'var(--shadow-raised)',
      pointerEvents: 'none'
    }
  }, content));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Tooltip.jsx", error: String((e && e.message) || e) }); }

// ui_kits/quotes/QuoteDetail.jsx
try { (() => {
function QuoteDetail({
  quote,
  onBack,
  onSend,
  sentFolios
}) {
  const {
    Badge,
    Button,
    Card,
    Dialog,
    Toast
  } = window.DevotteDesignSystem_75ebe4;
  const [confirm, setConfirm] = React.useState(false);
  const [toast, setToast] = React.useState(false);
  const sent = sentFolios.includes(quote.folio);
  const status = sent && quote.status === 'Borrador' ? 'Enviada' : quote.status;
  const subtotal = quote.items.reduce((s, i) => s + i.q * i.p, 0);
  const iva = Math.round(subtotal * 0.16);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-link)',
      fontSize: 13,
      fontFamily: 'var(--font-body)',
      padding: 0,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m15 18-6-6 6-6"
  })), "Volver a cotizaciones"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      margin: '14px 0 20px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 28,
      letterSpacing: '-0.02em',
      margin: 0,
      color: 'var(--navy)'
    }
  }, quote.title), /*#__PURE__*/React.createElement(Badge, {
    tone: window.statusTone(status)
  }, status), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm"
  }, "Descargar PDF"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: () => setConfirm(true),
    disabled: status !== 'Borrador'
  }, "Enviar al cliente"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "0"
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      textAlign: 'left',
      color: 'var(--text-muted)'
    }
  }, ['Concepto', 'Cant.', 'Precio', 'Importe'].map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      fontWeight: 500,
      fontSize: 12,
      padding: '14px 20px',
      borderBottom: '1px solid var(--border-subtle)',
      textAlign: i > 0 ? 'right' : 'left'
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, quote.items.map(it => /*#__PURE__*/React.createElement("tr", {
    key: it.c
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 20px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, it.c), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 20px',
      borderBottom: '1px solid var(--border-subtle)',
      textAlign: 'right'
    }
  }, it.q), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 20px',
      borderBottom: '1px solid var(--border-subtle)',
      textAlign: 'right'
    }
  }, window.DEVOTTE_FMT(it.p)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 20px',
      borderBottom: '1px solid var(--border-subtle)',
      textAlign: 'right',
      fontWeight: 600
    }
  }, window.DEVOTTE_FMT(it.q * it.p))))), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "3",
    style: {
      padding: '10px 20px 2px',
      textAlign: 'right',
      color: 'var(--text-muted)',
      fontSize: 13
    }
  }, "Subtotal"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 20px 2px',
      textAlign: 'right',
      fontSize: 13
    }
  }, window.DEVOTTE_FMT(subtotal))), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "3",
    style: {
      padding: '2px 20px',
      textAlign: 'right',
      color: 'var(--text-muted)',
      fontSize: 13
    }
  }, "IVA 16%"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '2px 20px',
      textAlign: 'right',
      fontSize: 13
    }
  }, window.DEVOTTE_FMT(iva))), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "3",
    style: {
      padding: '6px 20px 16px',
      textAlign: 'right',
      fontWeight: 600
    }
  }, "Total"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '6px 20px 16px',
      textAlign: 'right',
      fontWeight: 600,
      fontSize: 16
    }
  }, window.DEVOTTE_FMT(subtotal + iva)))))), /*#__PURE__*/React.createElement(Card, {
    padding: "20px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      fontWeight: 500,
      color: 'var(--teal-deep)',
      letterSpacing: '0.04em'
    }
  }, "<", quote.folio.toLowerCase(), ">"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: 'grid',
      gap: 12,
      fontSize: 13
    }
  }, [['Cliente', quote.client], ['Servicio', quote.service], ['Fecha', quote.date], ['Vigencia', '30 días naturales']].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-muted)',
      fontSize: 12
    }
  }, k), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500
    }
  }, v)))))), /*#__PURE__*/React.createElement(Dialog, {
    open: confirm,
    onClose: () => setConfirm(false),
    title: "Enviar cotizaci\xF3n",
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setConfirm(false)
    }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
      onClick: () => {
        setConfirm(false);
        setToast(true);
        onSend(quote.folio);
        setTimeout(() => setToast(false), 3500);
      }
    }, "Enviar"))
  }, "Se enviar\xE1 ", /*#__PURE__*/React.createElement("strong", null, quote.folio), " por correo a ", /*#__PURE__*/React.createElement("strong", null, quote.client), ". \xBFContinuar?"), toast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200
    }
  }, /*#__PURE__*/React.createElement(Toast, {
    tone: "ok",
    onClose: () => setToast(false)
  }, "Cotizaci\xF3n enviada.")));
}
window.QuoteDetail = QuoteDetail;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/quotes/QuoteDetail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/quotes/QuoteList.jsx
try { (() => {
function statusTone(s) {
  return {
    Borrador: 'neutral',
    Enviada: 'accent',
    Aprobada: 'ok',
    Vencida: 'error'
  }[s] || 'neutral';
}
function QuoteList({
  quotes,
  filter,
  onFilter,
  onOpen
}) {
  const {
    Tabs,
    Badge,
    Card
  } = window.DevotteDesignSystem_75ebe4;
  const tabs = ['Todas', 'Borrador', 'Enviada', 'Aprobada', 'Vencida'];
  const shown = filter === 'Todas' ? quotes : quotes.filter(q => q.status === filter);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 30,
      letterSpacing: '-0.02em',
      margin: '4px 0 18px',
      color: 'var(--navy)'
    }
  }, "Cotizaciones"), /*#__PURE__*/React.createElement(Tabs, {
    items: tabs,
    active: filter,
    onChange: onFilter
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 10,
      marginTop: 18
    }
  }, shown.map(q => /*#__PURE__*/React.createElement(Card, {
    key: q.folio,
    padding: "16px 20px",
    style: {
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 18
    },
    onClick: () => onOpen(q),
    onMouseEnter: e => e.currentTarget.style.boxShadow = 'var(--shadow-raised)',
    onMouseLeave: e => e.currentTarget.style.boxShadow = 'var(--shadow-card)'
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      fontWeight: 500,
      color: 'var(--teal-deep)',
      letterSpacing: '0.04em',
      width: 110,
      flexShrink: 0
    }
  }, q.folio), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontWeight: 600,
      fontSize: 14
    }
  }, q.client), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, q.title)), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-faint)'
    }
  }, q.date), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      width: 110,
      textAlign: 'right'
    }
  }, window.DEVOTTE_FMT(q.total)), /*#__PURE__*/React.createElement(Badge, {
    tone: statusTone(q.status)
  }, q.status)))), shown.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 32,
      textAlign: 'center',
      color: 'var(--text-muted)',
      fontSize: 14
    }
  }, "Sin cotizaciones en este estado.")));
}
window.QuoteList = QuoteList;
window.statusTone = statusTone;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/quotes/QuoteList.jsx", error: String((e && e.message) || e) }); }

// ui_kits/quotes/Shell.jsx
try { (() => {
function AppShell({
  children,
  onNew
}) {
  const {
    Button
  } = window.DevotteDesignSystem_75ebe4;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: 'var(--cream)'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      background: 'var(--white)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1040,
      margin: '0 auto',
      padding: '0 28px',
      height: 64,
      display: 'flex',
      alignItems: 'center',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/devotte-wordmark.svg",
    alt: "Devotte",
    style: {
      width: 120,
      display: 'block'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-muted)',
      letterSpacing: '0.04em'
    }
  }, "<cotizador>"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: onNew
  }, "Nueva cotizaci\xF3n"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: 'var(--navy)',
      color: 'var(--cream)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 12,
      fontWeight: 600
    }
  }, "MA")))), /*#__PURE__*/React.createElement("main", {
    style: {
      maxWidth: 1040,
      margin: '0 auto',
      padding: '28px 28px 64px'
    }
  }, children));
}
window.AppShell = AppShell;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/quotes/Shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/quotes/data.js
try { (() => {
window.DEVOTTE_QUOTES = [{
  folio: 'COT-2026-041',
  client: 'Ferretería El Yaqui',
  service: 'Software a la medida',
  title: 'Punto de venta e inventario',
  date: '08 jul 2026',
  status: 'Borrador',
  total: 68500,
  items: [{
    c: 'Sistema de punto de venta (2 cajas)',
    q: 1,
    p: 38000
  }, {
    c: 'Módulo de inventario y alertas de stock',
    q: 1,
    p: 22500
  }, {
    c: 'Capacitación en sitio (2 sesiones)',
    q: 2,
    p: 4000
  }]
}, {
  folio: 'COT-2026-040',
  client: 'Clínica Dental Sonrisa',
  service: 'Soporte técnico',
  title: 'Mantenimiento anual de equipos',
  date: '05 jul 2026',
  status: 'Enviada',
  total: 24000,
  items: [{
    c: 'Mantenimiento preventivo (12 visitas)',
    q: 12,
    p: 1500
  }, {
    c: 'Reemplazo de discos por SSD (4 equipos)',
    q: 4,
    p: 1500
  }]
}, {
  folio: 'COT-2026-039',
  client: 'Transportes Río Sonora',
  service: 'Consultoría',
  title: 'Diagnóstico de sistemas y plan 2027',
  date: '01 jul 2026',
  status: 'Aprobada',
  total: 18000,
  items: [{
    c: 'Diagnóstico de infraestructura y software',
    q: 1,
    p: 12000
  }, {
    c: 'Plan de tecnología 2027 (documento)',
    q: 1,
    p: 6000
  }]
}, {
  folio: 'COT-2026-037',
  client: 'Panificadora La Espiga',
  service: 'Software a la medida',
  title: 'Pedidos por WhatsApp',
  date: '26 jun 2026',
  status: 'Vencida',
  total: 42000,
  items: [{
    c: 'Bot de pedidos + panel de administración',
    q: 1,
    p: 42000
  }]
}];
window.DEVOTTE_FMT = n => '$' + n.toLocaleString('es-MX') + ' MXN';
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/quotes/data.js", error: String((e && e.message) || e) }); }

// ui_kits/website/Closing.jsx
try { (() => {
const {
  SectionLabel,
  Button,
  Input
} = window.DevotteDesignSystem_75ebe4;
function Closing({
  sent,
  onSend
}) {
  return /*#__PURE__*/React.createElement("section", {
    id: "contacto",
    style: {
      background: 'var(--gradient-deep)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--content-max)',
      margin: '0 auto',
      padding: '88px 32px',
      display: 'grid',
      gridTemplateColumns: '1.2fr 1fr',
      gap: 64,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionLabel, {
    color: "var(--teal)"
  }, "03 \xB7 contacto"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 40,
      letterSpacing: '-0.02em',
      color: 'var(--cream)',
      margin: '14px 0 12px'
    }
  }, "\xBFAlgo que arreglar o construir?"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--cream-80)',
      fontSize: 16,
      lineHeight: 1.6,
      margin: 0,
      maxWidth: 420
    }
  }, "Cu\xE9ntanos qu\xE9 necesitas y te respondemos el mismo d\xEDa h\xE1bil con los siguientes pasos."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--cream-60)',
      marginTop: 28,
      letterSpacing: '0.04em'
    }
  }, "hola@devotte.com \xB7 +52 662 000 0000"), /*#__PURE__*/React.createElement("img", {
    src: "../../assets/illustrations/contacto.svg",
    alt: "Burbuja de mensaje con el s\xEDmbolo de la marca y avi\xF3n de papel",
    style: {
      width: '100%',
      maxWidth: 300,
      marginTop: 32,
      display: 'block'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--cream)',
      borderRadius: 'var(--radius-xl)',
      padding: 28,
      boxShadow: 'var(--shadow-raised)'
    }
  }, sent ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '28px 8px'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/illustrations/exito.svg",
    alt: "Mensaje enviado",
    style: {
      width: 140,
      margin: '0 auto 14px',
      display: 'block'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 24,
      color: 'var(--navy)'
    }
  }, "Recibido."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      color: 'var(--text-muted)',
      margin: '10px 0 0'
    }
  }, "Te escribimos hoy mismo a tu correo.")) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Nombre",
    placeholder: "Tu nombre"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Correo",
    placeholder: "tu@correo.com"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "\xBFQu\xE9 necesitas?",
    placeholder: "Ej. punto de venta para mi tienda"
  }), /*#__PURE__*/React.createElement(Button, {
    onClick: onSend,
    style: {
      width: '100%'
    }
  }, "Enviar")))));
}
window.Closing = Closing;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Closing.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Footer.jsx
try { (() => {
function SiteFooter() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--navy)',
      borderTop: '1px solid var(--cream-08)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--content-max)',
      margin: '0 auto',
      padding: '28px 32px',
      display: 'flex',
      alignItems: 'center',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/devotte-icon-dark.svg",
    alt: "Devotte",
    style: {
      width: 28,
      borderRadius: 7
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--cream-60)',
      fontSize: 13
    }
  }, "Devotte \u2014 soporte t\xE9cnico \xB7 software a la medida \xB7 consultor\xEDa"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--cream-60)',
      letterSpacing: '0.04em'
    }
  }, "<hermosillo, son. \xB7 2026>")));
}
window.SiteFooter = SiteFooter;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Header.jsx
try { (() => {
const {
  Button
} = window.DevotteDesignSystem_75ebe4;
function SiteHeader({
  onCta
}) {
  const links = ['Servicios', 'Proceso', 'Contacto'];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      background: 'var(--cream)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--content-max)',
      margin: '0 auto',
      padding: '0 32px',
      height: 72,
      display: 'flex',
      alignItems: 'center',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/devotte-wordmark.svg",
    alt: "Devotte",
    style: {
      width: 132,
      display: 'block'
    }
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 8,
      marginLeft: 'auto'
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: '#' + l.toLowerCase(),
    style: {
      color: 'var(--navy)',
      fontSize: 14,
      fontWeight: 500,
      padding: '8px 14px',
      borderRadius: 999,
      textDecoration: 'none'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--navy-08)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, l))), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: onCta
  }, "Solicitar cotizaci\xF3n")));
}
window.SiteHeader = SiteHeader;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Hero.jsx
try { (() => {
const {
  SectionLabel,
  Button
} = window.DevotteDesignSystem_75ebe4;
function Hero({
  onCta
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--gradient-deep)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--content-max)',
      margin: '0 auto',
      padding: '96px 32px 104px',
      display: 'grid',
      gridTemplateColumns: '1.2fr 1fr',
      gap: 48,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionLabel, {
    color: "var(--teal)"
  }, "devotte \xB7 hermosillo, son."), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 56,
      lineHeight: 1.08,
      letterSpacing: '-0.02em',
      color: 'var(--cream)',
      margin: '20px 0 0',
      maxWidth: 680
    }
  }, "Tecnolog\xEDa que funciona, para negocios que no pueden detenerse."), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--cream-80)',
      fontSize: 18,
      lineHeight: 1.55,
      maxWidth: 540,
      margin: '22px 0 0'
    }
  }, "Soporte t\xE9cnico, software a la medida y consultor\xEDa tecnol\xF3gica para peque\xF1as y medianas empresas. Un solo equipo para lo que se descompone y lo que hay que construir."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 36
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    size: "lg",
    onClick: onCta
  }, "Solicitar cotizaci\xF3n"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    style: {
      background: 'transparent',
      border: '1px solid var(--cream-16)',
      color: 'var(--cream)'
    }
  }, "Ver servicios"))), /*#__PURE__*/React.createElement("img", {
    src: "../../assets/illustrations/hero.svg",
    alt: "Escritorio con laptop mostrando el s\xEDmbolo de Devotte",
    style: {
      width: '100%',
      maxWidth: 420,
      justifySelf: 'end'
    }
  })));
}
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Process.jsx
try { (() => {
const {
  SectionLabel
} = window.DevotteDesignSystem_75ebe4;
const steps = [['diagnóstico', 'Platicamos, revisamos tu operación y te decimos qué conviene — sin compromiso.'], ['cotización', 'Precio y alcance por escrito, en español llano. Sin letras chiquitas.'], ['manos a la obra', 'Reparamos, construimos o implementamos, con avances visibles cada semana.'], ['acompañamiento', 'No desaparecemos: soporte y ajustes después de la entrega.']];
function Process() {
  return /*#__PURE__*/React.createElement("section", {
    id: "proceso",
    style: {
      background: 'var(--gradient-mist)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--content-max)',
      margin: '0 auto',
      padding: '88px 32px'
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "02 \xB7 proceso"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 38,
      letterSpacing: '-0.02em',
      margin: '14px 0 40px',
      color: 'var(--navy)'
    }
  }, "As\xED trabajamos"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1.4fr',
      gap: 48,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/illustrations/proceso.svg",
    alt: "Camino punteado con hitos y bandera al final",
    style: {
      width: '100%',
      maxWidth: 380
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 24
    }
  }, steps.map(([t, d], i) => /*#__PURE__*/React.createElement("div", {
    key: t
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 500,
      fontSize: 13,
      color: 'var(--teal-deep)',
      letterSpacing: '0.04em'
    }
  }, "<0", i + 1, " \xB7 ", t, ">"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '12px 0 0',
      fontSize: 14,
      lineHeight: 1.6,
      color: 'var(--navy)'
    }
  }, d)))))));
}
window.Process = Process;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Process.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Services.jsx
try { (() => {
const {
  SectionLabel,
  Card
} = window.DevotteDesignSystem_75ebe4;
const serviceItems = [{
  t: 'Soporte técnico',
  d: 'Reparación de equipos y electrónica, mantenimiento preventivo y atención cuando algo se descompone.',
  img: '../../assets/illustrations/servicio-reparacion.svg'
}, {
  t: 'Software a la medida',
  d: 'Sistemas, sitios y aplicaciones construidos para tu operación real — no plantillas genéricas.',
  img: '../../assets/illustrations/servicio-software.svg'
}, {
  t: 'Consultoría tecnológica',
  d: 'Decisiones de tecnología claras: qué comprar, qué construir y qué dejar de pagar.',
  img: '../../assets/illustrations/servicio-consultoria.svg'
}];
function Services() {
  return /*#__PURE__*/React.createElement("section", {
    id: "servicios",
    style: {
      background: 'var(--cream)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--content-max)',
      margin: '0 auto',
      padding: '88px 32px'
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "01 \xB7 servicios"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 38,
      letterSpacing: '-0.02em',
      margin: '14px 0 40px',
      color: 'var(--navy)'
    }
  }, "Un solo equipo, tres frentes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 20
    }
  }, serviceItems.map(s => /*#__PURE__*/React.createElement(Card, {
    key: s.t,
    padding: "28px"
  }, /*#__PURE__*/React.createElement("img", {
    src: s.img,
    alt: "",
    style: {
      width: '100%',
      maxHeight: 130,
      objectFit: 'contain',
      display: 'block'
    }
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 22,
      margin: '18px 0 8px'
    }
  }, s.t), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      lineHeight: 1.6,
      color: 'var(--text-muted)'
    }
  }, s.d))))));
}
window.Services = Services;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Services.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.SectionLabel = __ds_scope.SectionLabel;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

})();
