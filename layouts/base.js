import Head from 'next/head';
import colors from '../styles/colors';

export default ({ children }) => (
  <div>
    <Head>
      <title>Ben Magyar</title>
      <meta name='description' content="I'm a developer from Pennsylvania currently working at NextGen." />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </Head>
    <style jsx>{`
      :global(html, body) {
        height: 100%;
        margin: 0;
        font-family: -apple-system,
          BlinkMacSystemFont,
          Segoe UI,
          Linotype,
          Helvetica Neue,
          Arial,
          sans-serif;
      }
      :global(a) {
        color: ${colors.blue};
        text-decoration: none;
      }
      :global(a:hover) {
        border-bottom: 2px solid ${colors.yellow};
      }
    `}</style>
    {children}
  </div>
)
