#notes
'''
Load File in Pandas and display a DCC Table
'''

# package imports
import io, base64, datetime, json, uuid
import pandas as pd

from dash import html, dcc, ctx, callback, Output, Input, State, MATCH, ALL
from dash.exceptions import PreventUpdate
import dash_cytoscape as cyto
import dash_bootstrap_components as dbc


ENCODING = 'latin-1'

## Tab Panels
tab_import = html.Div([
    dcc.Upload(
        id='upload-data',
        children=html.Div([
        'Drop file here or ',
        html.A('Click')
        ]),
        style={
        'width': '100%',
        'height': '37px',
        'lineHeight': '35px',
        'borderWidth': '1px',
        'borderStyle': 'dashed',
        'borderColor': '#ccc',
        'borderRadius': '5px',
        'textAlign': 'center',
        'marginTop': '12px',
        'marginBottom': '12px',
        },
        multiple=False,
    ),
    cyto.Cytoscape(
        id='import-graph',
        elements=[
            {'data': {'id': 'one', 'uid': 'one', 'label': 'Node 1'}, 'position': {'x': 10, 'y': 10}},
            {'data': {'id': 'two', 'uid': 'one', 'label': 'Node 2'}, 'position': {'x': 300, 'y': 10}},
            {'data': {'source': 'one', 'target': 'two','label': 'Edge'}}
        ],
        style={'width': '100%', 'height': '200px', 'backgroundColor': 'white'},
        layout={'name': 'preset'},
        stylesheet=[
            # Group selectors
            {
                'selector': 'edge',
                'style': {
                    'label': 'data(label)',
                    'font-size': '12px',
                }
            },
            {
                'selector': 'node',
                'style': {
                    'content': 'data(label)'+'\n'+'data(uid)',
                    'font-size': '12px',
                    'text-wrap': 'wrap',
                    
                }
            },
        ]
    ), 
    html.Div(id='import-graph-tapNodeData-output'), 
    html.Div(id='import-graph-tapEdgeData-output'),  
])


# add callbacks

#click on Node
@callback(Output('import-graph-tapNodeData-output', 'children'),
        Input('import-graph', 'tapNodeData'),
        State('user-data', 'data'),
    )
def displayTapNodeData(data, stored_data):
    if data:
        stored = json.loads(stored_data)
        prop_panel = [html.H6("Node Data")]
        for k in data.keys():
            if k == 'id': continue
            widget = dbc.InputGroup(
                [dbc.InputGroupText(k), 
                    dbc.Select(
                        id={
                            'type': 'import-field-select',
                            'field': k,
                            'el-id': data['id'],
                        },
                        options=stored['fields'],
                    )],
                size="sm",
                className="mb-3",
            )
            prop_panel.append(widget)
        
        return prop_panel

#click on Edge
@callback(Output('import-graph-tapEdgeData-output', 'children'),
        Input('import-graph', 'tapEdgeData'),
        State('user-data', 'data'),
    )
def displayTapEdgeData(data, stored_data):
    if data:
        stored = json.loads(stored_data)
        prop_panel = [html.H6("Edge Data")]
        for k in data.keys():
            if k == 'id': continue
            widget = dbc.InputGroup(
                [dbc.InputGroupText(k), 
                    dbc.Select(
                        id={
                            'type': 'import-field-select',
                            'field': k,
                            'el-id': data['id'],
                        },
                        options=stored['fields'],
                    )],
                size="sm",
                className="mb-3",
            )
            prop_panel.append(widget)
        
        return prop_panel

# #update importer
@callback(Output('import-graph', 'elements'),
    Input({'type': 'import-field-select', 'field': ALL, 'el-id': ALL}, 'value'),
    State('import-graph', 'elements'))
def update_filter(values, elements):
    for val in values:
        if val is None: continue
        if val == ctx.triggered[0]['value']:
            # print(elements)
            trig = ctx.triggered[0]['prop_id'].split('"')
            el_id = trig[3]
            field = trig[7]
            print('{} on {} = {}'.format(field, el_id, val))
            for ele in elements:
                id = ele['data']['id']
                if id == el_id:
                    ele['data'][field] = val
                if field == 'id':
                    if 'source' in ele['data']:
                        if ele['data']['source'] == el_id:
                            ele['data']['source'] = val
                        if ele['data']['target'] == el_id:
                            ele['data']['target'] = val
            # print(elements)  
    return elements

# store data in DCC Store
@callback(Output('user-data', 'data'),
        Input("button-data-clear", "n_clicks"),
        Input('upload-data', 'contents'),
        State('upload-data', 'filename'),
        State('upload-data', 'last_modified'),
        State('user-data', 'data'),
        prevent_initial_call=True)
def store_data(clear, contents, filename, date, stored_data):
    triggered_id = ctx.triggered_id
    if triggered_id == 'button-data-clear':
        return None
    
    if contents is None:
        raise PreventUpdate

    content_type, content_string = contents.split(',')
    decoded = base64.b64decode(content_string)

    if 'csv' in filename:
        # Assume that the user uploaded a CSV file
        df = pd.read_csv(io.StringIO(decoded.decode(ENCODING)), sep=';')
    elif 'xls' in filename:
        # Assume that the user uploaded an excel file
        df = pd.read_excel(io.BytesIO(decoded.decode(ENCODING)))
    table = filename.split(".")[0]
    fields = [{'label': "{} > {}".format(table, c), 'value': "{}: {}".format(table, c)} for c in df.columns]
    data = {
        'filename': table,
        'date': date,
        'type': content_type,
        'df': df.to_json(date_format='iso', orient='split'),
    }
    id = str(uuid.uuid4())
    if stored_data is not None:
        stored = json.loads(stored_data)
        stored[id] = data
        stored['fields'] += fields
    else:
        stored = {id:data, 'fields':fields}

    return json.dumps(stored, indent = 3)