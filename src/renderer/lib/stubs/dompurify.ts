interface DomPurifyLike {
  sanitize: (input: string) => string;
}

const domPurifyStub: DomPurifyLike = {
  sanitize: (input: string) => input,
};

export default domPurifyStub;
