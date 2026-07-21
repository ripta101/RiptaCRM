import { useEffect, useState } from "react";
import { Autocomplete, CircularProgress, TextField } from "@mui/material";
import type { UserSummary } from "@riptacrm/shared-types";

const DEBOUNCE_MS = 300;

export interface UserAutocompleteProps {
  label: string;
  value: UserSummary | null;
  onChange: (user: UserSummary | null) => void;
  search: (query: string) => Promise<UserSummary[]>;
  excludeIds?: string[];
  minWidth?: number;
}

export function UserAutocomplete({
  label,
  value,
  onChange,
  search,
  excludeIds = [],
  minWidth = 220,
}: UserAutocompleteProps) {
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      search(inputValue)
        .then((results) => {
          if (!cancelled) setOptions(results);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inputValue, search]);

  const filteredOptions = options.filter((u) => !excludeIds.includes(u.id));

  return (
    <Autocomplete
      size="small"
      sx={{ minWidth }}
      value={value}
      onChange={(_e, newValue) => onChange(newValue)}
      inputValue={inputValue}
      onInputChange={(_e, newInputValue) => setInputValue(newInputValue)}
      options={filteredOptions}
      loading={loading}
      filterOptions={(x) => x} // results are already server-filtered; disable MUI's client-side re-filter
      getOptionLabel={(u) => `${u.name} (${u.username})`}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
