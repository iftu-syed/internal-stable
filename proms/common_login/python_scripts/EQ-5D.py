import pandas as pd
import sys
import math # For checking NaN

# --- Constants ---
DIMENSIONS = ["MO", "SC", "UA", "PD", "AD"]
INTERACTION_TERMS = [
    "MO2SC2", "MO2SC3", "MO2UA2", "MO2UA3", "MO2PD2", "MO2PD3", "MO2AD2", "MO2AD3",
    "MO3SC3", "MO3UA3", "MO3PD2", "MO3PD3", "MO3AD2", "MO3AD3", "SC2UA2", "SC2UA3",
    "SC2PD2", "SC2PD3", "SC2AD2", "SC2AD3", "SC3UA2", "SC3UA3", "SC3PD2", "SC3PD3",
    "SC3AD2", "SC3AD3", "UA2PD2", "UA2PD3", "UA2AD2", "UA2AD3", "UA3PD2", "UA3PD3",
    "UA3AD2", "UA3AD3", "PD2AD2", "PD2AD3", "PD3AD2", "PD3AD3"
]
tto_data_global = None # To store loaded TTO data

# --- Data Loading ---
def load_tto_data(filepath='TTO.csv'):
    """Loads EQ-5D value set data from a CSV file into a pandas DataFrame."""
    try:
        df = pd.read_csv(filepath, index_col=0, na_values=['NA', 'NaN', '', 'N/A'])
        df.index = df.index.str.strip()
        df.columns = df.columns.str.strip()

        if df.empty:
            # print(f"Error: The file '{filepath}' loaded an empty dataset.", file=sys.stderr) # Keep error for CLI
            return None
        for col in df.columns:
             try:
                 df[col] = pd.to_numeric(df[col], errors='coerce')
             except Exception as e:
                 # print(f"Warning: Could not convert column '{col}' to numeric. Error: {e}", file=sys.stderr) # Keep warning for CLI
                 pass
        # print(f"Successfully loaded data from '{filepath}'.") # Comment out for script use
        # print(f"Terms/States found: {len(df.index)}")
        # print(f"Countries/Value Sets found: {len(df.columns)}")
        return df
    except FileNotFoundError:
        # print(f"Error: The file '{filepath}' was not found.", file=sys.stderr) # Keep error for CLI
        return None
    except pd.errors.EmptyDataError:
        # print(f"Error: The file '{filepath}' is empty.", file=sys.stderr) # Keep error for CLI
        return None
    except Exception as e:
        # print(f"An unexpected error occurred while reading {filepath}: {e}", file=sys.stderr) # Keep error for CLI
        return None

# --- Helper Functions (Mimicking R logic) ---
def _get_survey_value(survey_data, key, default=0.0):
    if key not in survey_data.index:
        return default
    value = survey_data[key]
    if pd.isna(value):
        return default
    return float(value)

def _min_one_2_or_3(scores, survey_data):
    if sum(scores.values()) > 5:
        return _get_survey_value(survey_data, "AtLeastOne2Or3")
    return 0.0

def _min_one_3(scores, survey_data):
    if any(s == 3 for s in scores.values()):
        return _get_survey_value(survey_data, "AtLeastOne3")
    return 0.0

def _dimension_scores(scores, survey_data):
    total_decrement = 0.0
    # trace = [] # Comment out trace for script use
    for dim in DIMENSIONS:
        level = scores[dim]
        if level > 1:
            term = f"{dim}{level}"
            decrement = _get_survey_value(survey_data, term)
            total_decrement += decrement
            # if decrement != 0.0 : trace.append(f"'{term}': {decrement:+.4f}")
    return total_decrement #, trace

# --- Ordinal Score Component Functions ---
def _d1(scores):
    count = sum(1 for dim in DIMENSIONS if scores.get(dim, 1) > 1)
    return max(0, count - 1)

def _i2(scores):
    count = sum(1 for dim in DIMENSIONS if scores.get(dim, 1) == 2)
    return max(0, count - 1)

def _i2_square(scores):
    return _i2(scores) ** 2

def _i3(scores):
    count = sum(1 for dim in DIMENSIONS if scores.get(dim, 1) == 3)
    return max(0, count - 1)

def _i3_square(scores):
    return _i3(scores) ** 2

def _c2_square(scores):
    return (sum(1 for dim in DIMENSIONS if scores.get(dim, 1) == 2))**2

def _c3_square(scores):
    return (sum(1 for dim in DIMENSIONS if scores.get(dim, 1) == 3))**2
    
def _o2(scores):
    levels = set(scores.values())
    return 1 if levels == {1, 2} or levels == {2} else 0

def _o3(scores):
    levels = set(scores.values())
    return 1 if levels == {1, 3} or levels == {3} else 0

def _x5(scores):
    return 1 if all(s in [2, 3] for s in scores.values()) else 0

def _z2(scores):
    return 1 if any(s == 2 for s in scores.values()) and any(s == 3 for s in scores.values()) else 0

def _z3(scores):
    if any(s == 3 for s in scores.values()):
        return sum(1 for s in scores.values() if s == 2)
    return 0

def _ordinal_score(scores, survey_data):
    total_ordinal_score = 0.0
    # trace = [] # Comment out trace for script use
    terms_values = {
        "D1": _d1(scores), "I2": _i2(scores), "I2square": _i2_square(scores),
        "I3": _i3(scores), "I3square": _i3_square(scores), "O2": _o2(scores),
        "O3": _o3(scores), "C2square": _c2_square(scores), "C3square": _c3_square(scores),
        "X5": _x5(scores), "Z2": _z2(scores), "Z3": _z3(scores)
    }
    for term, count in terms_values.items():
        if count > 0:
            coefficient = _get_survey_value(survey_data, term)
            term_value = count * coefficient
            total_ordinal_score += term_value
            # if term_value != 0.0: trace.append(f"'{term}': {count} * {coefficient:+.4f} = {term_value:+.4f}")
    return total_ordinal_score #, trace

def _interactions(scores, survey_data):
    total_interaction = 0.0
    # trace = [] # Comment out trace for script use
    score_dimensions_present = {f"{dim}{level}" for dim, level in scores.items() if level > 1}
    for term in INTERACTION_TERMS:
         coefficient = _get_survey_value(survey_data, term, default=None)
         if coefficient is not None:
             dim1 = term[:3]
             dim2 = term[3:]
             if dim1 in score_dimensions_present and dim2 in score_dimensions_present:
                 total_interaction += coefficient
                 # trace.append(f"'{term}': {coefficient:+.4f}")
    return total_interaction #, trace

# --- Australian TTO Specific Logic ---
def _australia_implausible():
    return {
        "12133": 0.154, "12233": 0.101, "13133": 0.154, "13233": 0.101,
        "13332": 0.020, "13333": 0.020, "22133": 0.086, "22233": 0.033,
        "23133": 0.086, "23233": 0.033, "23332": -0.048, "23333": -0.048,
        "32133": -0.083, "32233": -0.136, "32333": -0.206, "33132": -0.045,
        "33133": -0.083, "33232": -0.098, "33233": -0.136, "33323": -0.199,
        "33332": -0.217, "33333": -0.217
    }

def _collapse_score(scores):
    return "".join(str(scores[dim]) for dim in DIMENSIONS)

# --- Main Calculation Function ---
def calculate_eq5d3l_score(scores, country, type="TTO", survey_data=None):
    # trace = [] # Comment out trace for script use
    components = {}
    if not all(dim in scores for dim in DIMENSIONS):
        # print("Error: Scores dictionary must contain keys MO, SC, UA, PD, AD.", file=sys.stderr) # Keep for CLI error
        return None #, ["Error: Missing dimensions in input scores."]
    if not all(s in [1, 2, 3] for s in scores.values()):
        # print("Error: Scores must be 1, 2, or 3 for EQ-5D-3L.", file=sys.stderr) # Keep for CLI error
        return None #, ["Error: Invalid score values."]
    if type not in ["TTO", "VAS"]:
        # print("Error: Valuation type must be one of TTO or VAS.", file=sys.stderr) # Keep for CLI error
        return None #, ["Error: Invalid type specified."]
    if survey_data is None:
        # print("Error: Survey data for the country not provided.", file=sys.stderr) # Keep for CLI error
        return None #, ["Error: Missing survey data."]
    
    # Access global tto_data for column check if needed, ensure it's loaded in main
    global tto_data_global
    if tto_data_global is None: # Should be loaded by calling script's main
        # print("Error: TTO data not loaded globally.", file=sys.stderr)
        return None
    if country not in tto_data_global.columns:
        # print(f"Error: Country '{country}' not found in TTO.csv columns.", file=sys.stderr) # Keep for CLI error
        return None #, [f"Error: Country '{country}' not found."]

    if country == "Australia" and type == "TTO":
        score_str = _collapse_score(scores)
        implausible_map = _australia_implausible()
        if score_str in implausible_map:
            final_score = implausible_map[score_str]
            # trace.append(f"Applying Australia TTO implausible state value for '{score_str}': {final_score:.4f}")
            return round(final_score, 3) #, trace

    base_score = survey_data.get('FullHealth')
    if pd.isna(base_score):
        # print("Warning: 'FullHealth' value missing or NaN for this country. Assuming 1.0.", file=sys.stderr) # Keep for CLI
        base_score = 1.0
        # trace.append("Base Score ('FullHealth'): 1.0000 (Assumed)")
    else:
        base_score = float(base_score)
        # trace.append(f"Base Score ('FullHealth'): {base_score:+.4f}")
    components['Base'] = base_score

    comp_min1_2or3 = _min_one_2_or_3(scores, survey_data)
    # if comp_min1_2or3 != 0.0: trace.append(f"'AtLeastOne2Or3': {comp_min1_2or3:+.4f}")
    components['MinOne2Or3'] = comp_min1_2or3

    comp_min1_3 = _min_one_3(scores, survey_data)
    # if comp_min1_3 != 0.0: trace.append(f"'AtLeastOne3': {comp_min1_3:+.4f}")
    components['MinOne3'] = comp_min1_3
    
    # comp_dim_scores, dim_t = _dimension_scores(scores, survey_data) # Get only score
    comp_dim_scores = _dimension_scores(scores, survey_data)
    # trace.extend(dim_t)
    components['DimensionScores'] = comp_dim_scores

    # comp_ord_scores, ord_t = _ordinal_score(scores, survey_data) # Get only score
    comp_ord_scores = _ordinal_score(scores, survey_data)
    # trace.extend(ord_t)
    components['OrdinalScores'] = comp_ord_scores
    
    # comp_interactions, int_t = _interactions(scores, survey_data) # Get only score
    comp_interactions = _interactions(scores, survey_data)
    # trace.extend(int_t)
    components['Interactions'] = comp_interactions
    
    final_score = sum(components.values())

    # print("\n--- Calculation Trace ---") # Comment out for script use
    # for step in trace: print(step)
    # print("-------------------------")
    # print("Component Summary:")
    # for name, value in components.items(): print(f"  - {name}: {value:.4f}")
    # print("-------------------------")

    return round(final_score, 3) #, trace


# --- Main Execution Block (for command-line use) ---
if __name__ == "__main__":
    if len(sys.argv) != 8:
        print("ERROR: Usage: python EQ-5D.py <country> <MO_score> <SC_score> <UA_score> <PD_score> <AD_score> <tto_csv_filepath>", file=sys.stderr)
        sys.exit(1)

    country_arg = sys.argv[1]
    try:
        scores_arg = {
            "MO": int(sys.argv[2]),
            "SC": int(sys.argv[3]),
            "UA": int(sys.argv[4]),
            "PD": int(sys.argv[5]),
            "AD": int(sys.argv[6])
        }
    except ValueError:
        print("ERROR: Scores must be integers.", file=sys.stderr)
        sys.exit(1)
    
    tto_filepath_arg = sys.argv[7]

    # --- 1. Load Data ---
    tto_data_global = load_tto_data(tto_filepath_arg) 

    if tto_data_global is None:
        print(f"ERROR: Failed to load TTO data from '{tto_filepath_arg}'.", file=sys.stderr)
        sys.exit(1)

    # Validate scores
    if not all(s_val in [1, 2, 3] for s_val in scores_arg.values()):
        print("ERROR: Scores must be 1, 2, or 3.", file=sys.stderr)
        sys.exit(1)
    
    if country_arg not in tto_data_global.columns:
        print(f"ERROR: Country '{country_arg}' not found in TTO data.", file=sys.stderr)
        sys.exit(1)

    country_survey_data_arg = tto_data_global[country_arg]
    
    final_index_score = calculate_eq5d3l_score(
        scores=scores_arg,
        country=country_arg,
        type="TTO", 
        survey_data=country_survey_data_arg
    )

    if final_index_score is not None:
        print(f"{final_index_score:.3f}") # Print ONLY the score to stdout
    else:
        print("ERROR: Score calculation failed", file=sys.stderr)
        sys.exit(1)