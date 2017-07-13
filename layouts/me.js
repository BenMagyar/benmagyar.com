export const Container = ({ children }) => (
  <div className='root'>
    <style jsx>{`
      .root {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 0;
        margin: 0;
        position: absolute;
        width: 100%;
      }
      @media screen and (max-width: 767px) {
        .root {
          box-sizing: border-box;
          padding: 20px;
        }
      }
    `}</style>
    {children}
  </div>
)

export const Profile = ({ children }) => (
  <div className='root'>
    <style jsx>{`
      .root {
        display: flex;
        max-width: 500px;
      }
      @media screen and (max-width: 767px) {
        .root {
          max-width: none;
          display: block;
        }
      }
    `}</style>
    {children}
  </div>
)

export const Description = ({ children }) => (
  <div className='root'>
    <style jsx>{`
      .root {
        flex: 1;
      }
    `}</style>
    {children}
  </div>
)

export const Links = ({ children }) => (
  <ul className='root'>
    <style jsx>{`
      .root {
        margin: 0;
        width: 200px;
        margin-left: 20px;
        list-style-type: none;
        padding: 0;
      }
      .root :global(li a) {
        margin-bottom: 5px;
      }
      .root :global(li:nth-child(2) a) { background: rgba(0,0,0,.85) }
      .root :global(li:nth-child(3) a) { background: rgba(0,0,0,.7) }
      @media screen and (max-width: 767px) {
        .root {
          width: 100%;
          margin: 0;
        }
        .root :global(a) {
          margin-bottom: 10px;
        }
      }
    `}</style>
    {children}
  </ul>
)
