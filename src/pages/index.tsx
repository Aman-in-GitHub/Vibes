import { Navigate } from 'react-router';

function Index() {
  return <Navigate to="/feed" replace={true} />;
}

export default Index;
