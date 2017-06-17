import Base from '../layouts/base';
import { Container, Profile, Links, Description } from '../layouts/me';
import Label from '../components/label';
import Link from '../components/link';
import { H1 } from '../components/headers';
import colors from '../styles/colors';

export default () => (
  <Base>
    <style jsx>{`
      p {
        font-size: 15px;
        line-height: 1.65em;
      }
      .un-anchor {
        color: ${colors.white};
      }
      .un-anchor:hover {
        border: none;
      }
    `}</style>
    <Container>
      <Profile>
        <Description>
          <Label>
            <a className='un-anchor' href="/humans.txt">human</a>
          </Label>
          <H1>
            Ben Magyar
          </H1>
          <p>
            I'm a developer from Pennsylvania, currently working
            at <a target="_blank" href="https://www.nextgen.com/">NextGen</a>.
          </p>
        </Description>
        <Links>
          <Link target='_blank' href="https://github.com/BenMagyar">GitHub</Link>
          <Link target='_blank' href="https://keybase.io/benmagyar">Keybase</Link>
          <Link href='&#109;&#97;&#105;&#108;&#116;&#111;&#58;%6D%65%40%62%65%6E%6D%61%67%79%61%72%2E%63%6F%6D'>
            Email
          </Link>
        </Links>
      </Profile>
    </Container>
  </Base>
)
