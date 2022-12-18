
from dash import Dash
from dash import callback, html, Output, Input

import dash_mantine_components as dmc
import dash_cytoscape as cyto

from dash_iconify import DashIconify
import icons

# http://jsfiddle.net/bababalcksheep/ajhnmcrb/

app = Dash(
    __name__,
    external_stylesheets=[
        # include google fonts
        "https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;900&display=swap"
    ],
)

app.layout = dmc.MantineProvider(
    theme={
        "fontFamily": "'Inter', sans-serif",
        "primaryColor": "indigo",
        "components": {
            "Button": {"styles": {"root": {"fontWeight": 400}}},
            "Alert": {"styles": {"title": {"fontWeight": 500}}},
            "AvatarGroup": {"styles": {"truncated": {"fontWeight": 500}}},
        },
    },
    inherit=True,
    withGlobalStyles=True,
    withNormalizeCSS=True,
    children=[
        dmc.Header(
            height=60, children=[
                dmc.Text("Main Bar")], style={"backgroundColor": "#fff"}
        ),
        dmc.Navbar(
            p="md",
            width={"base": 300},
            fixed=True,
            children=[
                dmc.Tabs(
                    [
                        dmc.TabsList(
                            [
                                dmc.Tab(
                                    "Import",
                                    icon=DashIconify(icon="ic:outline-import-export"),
                                    value="import",
                                ),
                                dmc.Tab(
                                    "Create",
                                    icon=DashIconify(icon="ic:baseline-edit"),
                                    value="create",
                                ),
                                dmc.Tab(
                                    "Edit",
                                    icon=DashIconify(icon="ic:baseline-settings"),
                                    value="edit",
                                ),
                            ]
                        ),
                        dmc.TabsPanel("import tab content", value="import"),
                        dmc.TabsPanel(
                            html.Div([
                                dmc.Select(
                                    placeholder="Select one",
                                    id="icons-select",
                                    searchable=True,
                                    nothingFound="Not found",
                                    data=[
                                        {"value": icons.BASE, "label": "Base"},
                                        {"value": icons.EVT, "label": "Events"},
                                        {"value": icons.PERS, "label": "Persons"},
                                        {"value": icons.OBJ, "label": "Objects"},
                                        {"value": icons.VHC, "label": "Vehicles"},
                                        {"value": icons.LOC, "label": "Locations"}
                                    ],
                                    style={"width": "100%", "marginTop": 10, "marginBottom": 10},
                                ),
                                
                                dmc.SimpleGrid(
                                    id="icon-selected",
                                    cols=3,
                                    children=[]
                                )
                            ]),
                            value="create"),
                        dmc.TabsPanel("edit tab content", value="edit"),
                    ],
                    value="import",
                )
            ],
        ),
        html.Div([
            cyto.Cytoscape(
                id='graph',
                elements=[
                    {'data': {'id': 'one', 'label': 'Node 1'}, 'position': {'x': 350, 'y': 350}, 'classes':'triangle'},
                    {'data': {'id': 'two', 'label': 'Node 2'}, 'position': {'x': 500, 'y': 400}},
                    {'data': {'source': 'one', 'target': 'two','label': 'Node 1 to 2'}}
                ],
                style={'width': '800px', 'height': '800px'},
                layout={'name': 'preset'},
                stylesheet=[
                    # Group selectors
                    {
                        'selector': 'node',
                        'style': {
                            'content': 'data(label)',
                            
                            'font-size': '12px',
                            
                        }
                    },

                    # Class selectors
                    {
                        'selector': '.red',
                        'style': {
                            'background-color': 'red',
                            'line-color': 'red'
                        }
                    },
                    {
                        'selector': '.triangle',
                        'style': {
                            'shape': 'triangle',
                            'font-family': 'Open Sans',
                            'background-image': 'house-solid.svg'
                        }
                    }
                ]
                        )
                    ],
            )
    ],
)

@callback(Output("icon-selected", "children"), Input("icons-select", "value"))
def select_value(value):
    if value is None:
        return None
    output = [
        html.Div([
            dmc.ActionIcon(
                DashIconify(icon=icon, width=20),
                size="lg",
            ),
            dmc.Text(icon.split(":")[1], size="xs"),
        ],
        draggable='true',
        )
        for icon in value
    ]
    return output

if __name__ == "__main__":
    app.run_server(debug=True)