

const Component = ({children, onClick}) => {

  return (
    <button className="ofc-icon-button" onClick={onClick}>
      {children}
    </button>
  );
};

export default Component;