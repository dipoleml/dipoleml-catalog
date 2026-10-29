import { FiHome } from "react-icons/fi";
import { MdKeyboardArrowRight } from "react-icons/md";

export default () => {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol role="list" className="flex items-center space-x-2">
        <li>
          <div>
            <a className="text-gray-400 hover:text-gray-500" href="/">
              <FiHome />
              <span className="sr-only">Home</span>
            </a>
          </div>
        </li>

        <li>
          <div className="flex items-center">
            <MdKeyboardArrowRight />
            <a
              className="ml-2 text-md font-medium text-primary"
              aria-current="page"
            >
              Categories
            </a>
          </div>
        </li>
      </ol>
    </nav>
  );
};
