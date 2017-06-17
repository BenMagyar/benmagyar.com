import colors from '../styles/colors';

export default ({ children }) => (
  <span>
    <style jsx>{`
      background: ${colors.blue};
      color: ${colors.white};
      padding: 3px 5px;
      font-size: 11px;
      border-radius: 2px;
      text-transform: uppercase;
    `}</style>
    {children}
  </span>
)
