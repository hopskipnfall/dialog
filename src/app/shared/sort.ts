type Comparable = number | string | boolean;

export const sortOnField = <T, P extends Comparable>(collection: T[], getSortField: (t: T) => P): T[] => {
  // https://stackoverflow.com/a/1129270/2875073
  return collection.sort((a, b) =>
    // eslint-disable-next-line no-nested-ternary
    getSortField(a) > getSortField(b) ? 1 : getSortField(b) > getSortField(a) ? -1 : 0,
  );
};
