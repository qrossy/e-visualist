# notes
'''
This directory is meant to be for a specific page.
We will define the page and import any page specific components that we define in this directory.
This file should serve the layouts and callbacks.
The callbacks could be in their own file, but you'll need to make sure to import the file so they load.
'''

# package imports
import json
import pandas as pd

from dash import html, ctx, dash_table, callback, Output, Input, State
from dash.exceptions import PreventUpdate
import dash_bootstrap_components as dbc

# local imports

inputLayout = html.Div([
    dbc.Button("Clear Data", id='button-data-clear', color="primary", className="me-1"),
    html.Div(id='output-data-upload',
        style={'width': '100%', 
            'height': '100%'
            },
        ),
    dbc.Textarea(
        id="textarea-data-upload",
        size="sm",
        className="mb-3",
        placeholder="User Data is empty",
        rows=10,
        ),
    ],
    style = {
        'paddingTop': '10px',
        'paddingBottom': '10px',
        'paddingRight': '10px',
    }
)

# Callbacks

# Show raw data stored in DCC Store
@callback(Output('textarea-data-upload', 'value'),
    Input('user-data', 'modified_timestamp'),
    State('user-data', 'data'))
def textarea_from_store(ts, stored_data):
    if ts is None:
        raise PreventUpdate
    return stored_data

# Show table from data stored in DCC Store
@callback(Output('output-data-upload', 'children'),
    Input("button-data-clear", "n_clicks"),
    Input('user-data', 'modified_timestamp'),
    State('user-data', 'data'))
def output_from_store(clear, ts, stored_data):
    triggered_id = ctx.triggered_id
    if triggered_id == 'button-data-clear':
        return None
    if stored_data is None:
        raise PreventUpdate

    stored = json.loads(stored_data)
    divs = []
    for k in stored.keys():
        if k == 'fields': continue
        data = stored[k]
        df = pd.read_json(data['df'], orient='split')
        divs.append(html.H5(data['filename']))
        divs.append(
            dash_table.DataTable(
                id='data-table-'+k,
                data=df.to_dict('records'),
                columns=[{'id': c, 'name': c, "selectable": False} for c in df.columns],
                page_size=5,
                style_cell={
                    'textAlign': 'left',
                    'fontSize': '12px',
                    # 'minWidth': '50px', 'width': '50px', 'maxWidth': '50px',
                    # 'overflow': 'hidden',
                    # 'textOverflow': 'ellipsis',
                },
                style_table={'overflowX': 'auto'},
                style_as_list_view=True,
                sort_action="native",
                sort_mode="multi",
                column_selectable="single",
                # row_selectable="multi",
                selected_columns=[],
                selected_rows=[],
                page_action="native",
                page_current= 0,
                css=[{
                    'selector': '.dash-spreadsheet td div',
                    'rule': '''
                        line-height: 15px;
                        max-height: 15px; min-height: 15px; height: 15px;
                        display: block;
                        overflow-y: hidden;
                    '''
                }],
                tooltip_data=[
                    {
                        column: {'value': str(value), 'type': 'markdown'}
                        for column, value in row.items()
                    } for row in df.to_dict('records')
                ],
                tooltip_duration=None
            )
        )

    return html.Div(divs)