import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div>

          <Link to="/" className="text-xl font-semibold text-gray-800">
            Cabinet Podologie
          </Link>
          </div>
          <div>

          <Link
            to="/patient/new"
            className="bg-blue-500 m-2 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            >
            New
          </Link>
          <Link
            to="/search"
            className="bg-blue-500 m-2 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            >
            R
          </Link>
              </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;