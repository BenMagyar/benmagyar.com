import colors from '../styles/colors';

export default ({ href, target, style, children }) => (
  <li>
    <a target={target} href={href} style={{ display: 'block' }}>
      <style jsx>{`
        a {
          text-decoration: none;
          padding: 6px 10px;
          background: ${colors.black};
          color: ${colors.white};
          font-size: 11px;
          border-radius: 2px;
          line-height: 25px;
          vertical-align: center;
          text-align: center;
          height: 25px;
          text-transform: uppercase;
          font-weight: 600;
        }
        a:hover {
          background: ${colors.blue} !important;
          border: none;
        }
      `}</style>
      {children}
    </a>
  </li>
)
