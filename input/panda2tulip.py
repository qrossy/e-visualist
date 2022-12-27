from tulip import tlp

class Panda2Tulip:
  """
  Class to import Panda dataframe in a Tulip graph

  Attributes
  ----------
  nodes_pd : Panda dataframe
      list of nodes with attributes
  edge_pd : Panda dataframe
      list of edges with attributes
  """

  def __init__(self, nodes_pd, edges_pd):
    
    #Parameters to define based on the original dataset
    self.node_id = 'Node_value'
    self.node_type = 'Node_type'
    self.edge_source = 'Edge_source'
    self.edge_target = 'Edge_target'
    
    #Main variables      
    self.graph = tlp.newGraph()
    self.nodes_pd = nodes_pd
    self.edges_pd = edges_pd

    #dic to store nodes
    self.nodes = {}

    # not used (for Tulip app)
    self.icon_mapping = {
          "Add_ip_anon": "md-desktop-classic",
          "Email_anon": "md-email",
          "Marchand": "md-web",
          "NoTrans_anon": "md-file-document",
          "Pseudonym": "md-human",
          "telephone_anon": "md-sim",
          }

  def run(self):
    '''Load data and return the Tulip Graph'''
    self.loadProperties(self.nodes_pd)
    self.loadProperties(self.edges_pd)
    self.loadNodes()
    self.loadEdges()
    return self.graph

  def loadProperties(self, data):
    '''
    Private Method: load properties in Graph from DataFrame
    Attributes

    TODO: set the types of properties based on Panda datatypes
    ----------
    data : Panda dataframe (nodes or edges)
    '''
    for col in data.columns:
        self.graph.getStringProperty(col)

  def loadEdges(self):
    '''
    Private Method: load edges in Graph from DataFrame
    
    TODO: nodes have to loaded first, might be changed
    '''
    for index, row in self.edges_pd.iterrows():
        s = self.nodes[row[self.edge_source]]
        t = self.nodes[row[self.edge_target]]
        e = self.graph.addEdge(s, t)
        for k in row.keys():
            self.graph.getStringProperty(k)[e] = row[k]

  def loadNodes(self):
    '''
    Private Method: load nodes in Graph from DataFrame
    '''
    for index, row in self.nodes_pd.iterrows():
        self.addNode(row)

  def addNode(self, row):
    '''
    Private Method: load node from a row in node DataFrame
    Attributes
    ----------
    row : a row from the Panda dataframe of nodes
    '''
    viewLabel = self.graph['viewLabel']
    node = None
    if row[self.node_id] not in self.nodes:
      node = self.graph.addNode()
      for k in row.keys():
            self.graph.getStringProperty(k)[node] = row[k]
      viewLabel[node] = str(row[self.node_id])
      # self.setIcon(row[self.node_type], node)
      self.nodes[row[self.node_id]]= node
    else:
        node = self.nodes[row[self.node_id]]
    return node  

  def setIcon(self, string, node):
    '''
    Private Method: set the node icon based on the "self.icon_mapping" dictionnary (not used with cytoscape)
    '''
    viewIcon = self.graph['viewIcon']
    viewIcon[node] = self.icon_mapping[string]