import base64, io, datetime

from dash import Dash
from dash import dcc, callback, html, Output, Input, State, dash_table

import dash_mantine_components as dmc
import dash_cytoscape as cyto

from dash_iconify import DashIconify
import utils.icons as icons

import pandas as pd
from pages.import.panda2tulip import Panda2Tulip

# https://www.dash-mantine-components.com/components/header
# https://icon-sets.iconify.design/fa6-solid/hospital/
# https://dash.plotly.com/cytoscape/styling
# https://js.cytoscape.org/#style/background-image
# http://jsfiddle.net/bababalcksheep/ajhnmcrb/

app = Dash(
    __name__,
    external_stylesheets=[
        # include google fonts
        "https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;900&display=swap"
    ],
)

ENCODING = 'latin-1'

def parse_contents(contents, filename, date):
    content_type, content_string = contents.split(',')

    decoded = base64.b64decode(content_string)
    if 'csv' in filename:
        # Assume that the user uploaded a CSV file
        df = pd.read_csv(io.StringIO(decoded.decode(ENCODING)), sep=';')
    elif 'xls' in filename:
        # Assume that the user uploaded an excel file
        df = pd.read_excel(io.BytesIO(decoded))


    return html.Div([
        html.H5(filename),
        html.H6(datetime.datetime.fromtimestamp(date)),

         dash_table.DataTable(
            id='data-table',
            data=df.to_dict('records'),
            columns=[{'id': c, 'name': c, "selectable": False} for c in df.columns],
            page_size=10,
            style_cell={'textAlign': 'left'},
            style_as_list_view=True,
            sort_action="native",
            sort_mode="multi",
            column_selectable="single",
            # row_selectable="multi",
            selected_columns=[],
            selected_rows=[],
            page_action="native",
            page_current= 0,
            # style_table={'height': '300px', 'overflowY': 'auto'}
        ),
        html.Div(id='data-graphs'),
        dmc.ActionIcon(
            DashIconify(icon="ic:baseline-device-hub", width=20),
            size="lg",
            variant="filled",
            id="action-import",
            mb=10,
        ),
    ])

NAVBAR = dmc.Tabs([
    dmc.TabsList([
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
        ],
    ),
    dmc.TabsPanel(html.Div([
        dcc.Upload(
            id='upload-data',
            children=html.Div([
            'Drop file here or ',
            html.A('Click')
            ]),
            style={
            'width': '90%',
            'height': '37px',
            'lineHeight': '35px',
            'borderWidth': '1px',
            'borderStyle': 'dashed',
            'borderColor': '#ccc',
            'borderRadius': '5px',
            'textAlign': 'center',
            'margin': '10px'
            },
            # Allow multiple files to be uploaded
            multiple=True
        ),
        ]),
        value="import"),
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


GRAPH_UI = dmc.Tabs([
    dmc.TabsList([
        dmc.Tab(
            "Data",
            icon=DashIconify(icon="ic:outline-import-export"),
            value="data",
        ),
        dmc.Tab(
            "Graph",
            icon=DashIconify(icon="ic:baseline-edit"),
            value="graph",
        ),
        ]
    ),

    dmc.TabsPanel(html.Div([
        html.Div(id='output-data-upload',
            style={'width': '800px', 
            'height': '100%'
            },
        ),
    ]), 
    value="data"),

    dmc.TabsPanel(html.Div([
        cyto.Cytoscape(
            id='graph',
            elements=[
                {'data': {'id': 'one', 'label': 'Node 1'}, 'position': {'x': 40, 'y': 350}, 'classes':'icon'},
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
                    'selector': '.icon',
                    'style': {
                        'shape': 'round-rectangle',
                        'font-family': 'Open Sans',
                        'background-fit': 'contain',
                        'width': '50px',
                        'background-image': 'https://raw.githubusercontent.com/qrossy/e-visualist/272d2a7b9568fb9b6e30cfe1f75fe78cb293f86d/house-solid.svg'
                    }
                }
            ]
            )
        ]), 
        value="graph"),
    ],
    value="data"
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
        dmc.Grid(
            children=[
                html.Div([NAVBAR], 
                style={'padding':'20px', 
                    'border-right': 'thick double', 
                    'height':'100%', 
                    'width':'300px'
                }),
                html.Div([GRAPH_UI], style={'padding':'20px'})
            ],
            gutter="xl",
        )
    ]
)

@app.callback(Output('output-data-upload', 'children'),
              Input('upload-data', 'contents'),
              State('upload-data', 'filename'),
              State('upload-data', 'last_modified'))
def update_output(list_of_contents, list_of_names, list_of_dates):
    if list_of_contents is not None:
        children = [
            parse_contents(c, n, d) for c, n, d in
            zip(list_of_contents, list_of_names, list_of_dates)]
        return children


@app.callback(
    Output('data-graphs', "children"),
    Input('data-table', "derived_virtual_data"),
    Input('data-table', "derived_virtual_selected_rows"))
def update_graphs(rows, derived_virtual_selected_rows):
    # When the table is first rendered, `derived_virtual_data` and
    # `derived_virtual_selected_rows` will be `None`. This is due to an
    # idiosyncrasy in Dash (unsupplied properties are always None and Dash
    # calls the dependent callbacks when the component is first rendered).
    # So, if `rows` is `None`, then the component was just rendered
    # and its value will be the same as the component's dataframe.
    # Instead of setting `None` in here, you could also set
    # `derived_virtual_data=df.to_rows('dict')` when you initialize
    # the component.
    if derived_virtual_selected_rows is None:
        derived_virtual_selected_rows = []

    dff = df if rows is None else pd.DataFrame(rows)

    colors = ['#7FDBFF' if i in derived_virtual_selected_rows else '#0074D9'
              for i in range(len(dff))]

    return [
        dcc.Graph(
            id=column,
            figure={
                "data": [
                    {
                        "x": dff["country"],
                        "y": dff[column],
                        "type": "bar",
                        "marker": {"color": colors},
                    }
                ],
                "layout": {
                    "xaxis": {"automargin": True},
                    "yaxis": {
                        "automargin": True,
                        "title": {"text": column}
                    },
                    "height": 250,
                    "margin": {"t": 10, "l": 10, "r": 10},
                },
            },
        )
        # check if column exists - user may have deleted it
        # If `column.deletable=False`, then you don't
        # need to do this check.
        for column in ["pop", "lifeExp", "gdpPercap"] if column in dff
    ]


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